import { FilterObject, FilterQuery, FilterValue } from '@mikro-orm/core';
import {
  AND,
  AND_VERBOSE,
  ComparisonNode,
  LogicNode,
  EQ,
  ExpressionNode,
  GE,
  GE_VERBOSE,
  GT,
  GT_VERBOSE,
  IN,
  LE,
  LE_VERBOSE,
  LT,
  LT_VERBOSE,
  NEQ,
  OUT,
} from '@rsql/ast';
import { parse } from '@rsql/parser';
import { mergeDeepRight, reduceRight } from 'ramda';
import { getScalarValue, convertWildcards, isLike } from './utils';

/**
 * Converts an RSQL expression node to a MikroORM filter query.
 *
 * @param node - The expression node to convert.
 * @param options - Optional settings for conversion.
 * @returns The corresponding MikroORM filter query.
 * @throws Will throw an error if the node type is unknown.
 */
const convertNodeToQuery = <T>(
  node: ExpressionNode,
  options?: Options
): FilterQuery<T> => {
  const type = node.type;
  switch (type) {
    case 'COMPARISON':
      return handleComparisonNode(node, options);
    case 'LOGIC':
      return handleLogicalNode(node, options);
    default:
      throw new Error(`Unknown node type: ${type}`);
  }
};

/**
 * Handles logical nodes and converts them to a filter query.
 *
 * @param node - The logical node to handle.
 * @param options - Optional settings for conversion.
 * @returns The corresponding MikroORM filter query.
 */
const handleLogicalNode = <T>(
  node: LogicNode,
  options?: Options
): FilterQuery<any> => {
  const leftQuery = convertNodeToQuery<T>(node.left, options);
  const rightQuery = convertNodeToQuery<T>(node.right, options);
  if (node.operator === AND || node.operator === AND_VERBOSE) {
    return { $and: mergeQueries(leftQuery, rightQuery) };
  }
  return { $or: mergeQueries(leftQuery, rightQuery) };
};

/**
 * Handles comparison nodes and converts them to a filter query.
 *
 * @param node - The comparison node to handle.
 * @param options - Optional settings for conversion.
 * @returns The corresponding MikroORM filter query.
 * @throws Will throw an error if the comparison operator is unknown.
 */
const handleComparisonNode = <T>(
  node: ComparisonNode,
  options?: Options
): FilterQuery<T> => {
  const selector = node.left.selector;
  const operation = getOperationForNode(node, options);
  if (!operation) {
    throw new Error(`Unknown comparison operator: ${node.operator}`);
  }
  const filter = operation(node, options);
  return resolveRelationPath(selector, filter);
};

/**
 * Extracts the operation for a given comparison node.
 *
 * @param node - The comparison node.
 * @param options - Optional settings for conversion.
 * @returns The operation to be applied for the node's operator.
 */
const getOperationForNode = (node: ComparisonNode, options?: Options) => {
  return (options?.operatorMap || defaultOperatorMap)[node.operator];
};

/**
 * Resolves the relation path for a selector and applies it to the filter query.
 *
 * @param selector - The full selector string, potentially containing nested relations.
 * @param filter - The generated filter query.
 * @returns The filter query with properly resolved relation paths.
 */
const resolveRelationPath = <T>(
  selector: string,
  filter: FilterQuery<any>
): FilterQuery<T> => {
  const relations = selector.split('.');
  const filterValue: FilterValue<any> = filter['$not']
    ? filter['$not'][selector]
    : filter[selector];
  return relations.length > 1
    ? relations.reduceRight((acc, curr) => ({ [curr]: acc }), filterValue)
    : filter;
};

/**
 * Handles equality comparisons.
 *
 * @param node - The comparison node to handle.
 * @param options - Optional settings for conversion.
 * @returns The corresponding filter query for equality.
 */
const handleEqual = <T>(
  node: ComparisonNode,
  options?: Record<string, any>
): FilterQuery<T> => {
  const selector = node.left.selector;
  const value = node.right.value as string;
  const filter: FilterObject<any> = { [selector]: { $eq: value } };
  if (isLike(value)) {
    const operator = options?.caseInsensitive ? '$ilike' : '$like';
    filter[selector] = { [operator]: convertWildcards(value) };
  }
  return filter;
};

/**
 * Handles inequality comparisons.
 *
 * @param node - The comparison node to handle.
 * @param options - Optional settings for conversion.
 * @returns The corresponding filter query for inequality.
 */
const handleNotEqual = <T>(
  node: ComparisonNode,
  options?: Record<string, any>
): FilterQuery<T> => {
  const selector = node.left.selector;
  const value = node.right.value as string;
  let filter: FilterQuery<any> = { [selector]: { $ne: value } };
  if (isLike(value)) {
    const operator = options?.caseInsensitive ? '$ilike' : '$like';
    filter = {};
    filter['$not'] = { [selector]: { [operator]: convertWildcards(value) } };
  }
  return filter;
};

/**
 * Type definition for operator mapping.
 */
type OperatorMap = Record<
  string,
  (node: ComparisonNode, options?: Record<string, any>) => FilterQuery<any>
>;

/**
 * Default operator mapping for RSQL operators.
 */
const defaultOperatorMap: OperatorMap = {
  [EQ]: handleEqual,
  [NEQ]: handleNotEqual,
  [GT]: (node: ComparisonNode) => ({
    [node.left.selector]: { $gt: getScalarValue(node.right.value) },
  }),
  [GE]: (node: ComparisonNode) => ({
    [node.left.selector]: { $gte: getScalarValue(node.right.value) },
  }),
  [LT]: (node: ComparisonNode) => ({
    [node.left.selector]: { $lt: getScalarValue(node.right.value) },
  }),
  [LE]: (node: ComparisonNode) => ({
    [node.left.selector]: { $lte: getScalarValue(node.right.value) },
  }),
  [IN]: (node: ComparisonNode) => ({
    [node.left.selector]: { $in: node.right.value },
  }),
  [OUT]: (node: ComparisonNode) => ({
    [node.left.selector]: { $nin: node.right.value },
  }),
};

defaultOperatorMap[GT_VERBOSE] = defaultOperatorMap[GT];
defaultOperatorMap[GE_VERBOSE] = defaultOperatorMap[GE];
defaultOperatorMap[LT_VERBOSE] = defaultOperatorMap[LT];
defaultOperatorMap[LE_VERBOSE] = defaultOperatorMap[LE];

/**
 * Merges two filter queries into one.
 *
 * @param leftQuery - The left filter query.
 * @param rightQuery - The right filter query.
 * @returns An array of merged filter queries.
 */
const mergeQueries = <T>(
  leftQuery: FilterQuery<any>,
  rightQuery: FilterQuery<any>
): FilterQuery<T>[] => {
  let mergeResult = null;

  ['$and', '$or'].forEach(operator => {
    if (leftQuery[operator] && rightQuery[operator]) {
      //console.log(`BOTH: LEFT: ${JSON.stringify(leftQuery)} RIGHT: ${JSON.stringify(rightQuery)}`)
      mergeResult = [leftQuery, rightQuery];
    } else if (leftQuery[operator]) {
      //console.log(`ONLY LEFT: LEFT: ${JSON.stringify(leftQuery)} RIGHT: ${JSON.stringify(rightQuery)}`)
      mergeResult = [
        reduceRight(mergeDeepRight, rightQuery, leftQuery[operator]),
      ];
    } else if (rightQuery[operator]) {
      //console.log(`ONLY RIGHT: LEFT: ${JSON.stringify(leftQuery)} RIGHT: ${JSON.stringify(rightQuery)}`)
      mergeResult = [mergeDeepRight(leftQuery, rightQuery)];
    }
  });
  if (!mergeResult) {
    //console.log(`NOBODY: LEFT: ${JSON.stringify(leftQuery)} RIGHT: ${JSON.stringify(rightQuery)}`)
    mergeResult = [mergeDeepRight(rightQuery, leftQuery)];
  }

  return mergeResult;
};

/**
 * Options for RSQL conversion functions.
 */
export type Options = {
  caseInsensitive?: boolean;
  logger?: any;
  operatorMap?: OperatorMap;
};

/**
 * Converts an RSQL expression node to a MikroORM filter query.
 *
 * @param expression - The expression node to convert.
 * @param options - Optional settings for conversion.
 * @returns The corresponding MikroORM filter query.
 */
export const rsqlExpressionToQuery = <T>(
  expression: ExpressionNode,
  options?: Options
): FilterQuery<T> => convertNodeToQuery(expression, options);

/**
 * Converts an RSQL string to a MikroORM filter query.
 *
 * @param rsql - The RSQL string to convert.
 * @param options - Optional settings for conversion.
 * @returns The corresponding MikroORM filter query.
 */
export const rsqlStringToQuery = <T>(
  rsql: string,
  options?: Options
): FilterQuery<T> => {
  const query = rsqlExpressionToQuery<T>(parse(rsql), options);
  options?.logger?.debug(`Source: ${rsql}, Target: ${JSON.stringify(query)}`);
  return query;
};
