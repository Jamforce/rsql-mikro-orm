export const isDate = <T>(value: T): boolean => {
  if (typeof value !== 'string') return false;
  const dateRegex =
    /\d{4}-\d{2}-\d{2}T?(\d{2}:\d{2}:\d{2})?(\+\d{2}:\d{2}Z?)?/gm;
  return !!value.match(dateRegex)?.length;
};

export const getScalarValue = <T>(value: T) => {
  return isDate(value) ? new Date(value as unknown as string) : value;
};

const RSQL_WILDCARD = '*';
const ORM_WILDCARD = '%';

export const isLike = (value: string) => {
  return value.startsWith(RSQL_WILDCARD) || value.endsWith(RSQL_WILDCARD);
};

export const convertWildcards = (val: string): string => {
  let convertedValue = val;
  if (convertedValue.startsWith(RSQL_WILDCARD)) {
    convertedValue = `${ORM_WILDCARD}${convertedValue.slice(1)}`;
  }
  if (convertedValue.endsWith(RSQL_WILDCARD)) {
    convertedValue = `${convertedValue.slice(0, -1)}${ORM_WILDCARD}`;
  }
  return convertedValue;
};
