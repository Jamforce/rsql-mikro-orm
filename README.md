# RSQL to MikroOrm

A TypeScript library that seamlessly converts RSQL (RESTful Service Query Language) strings into filter queries compatible with MikroORM.

RSQL enables users to build queries that are both human-readable and machine-friendly, making it ideal for filtering data in applications. With `rsql-mikro-orm`, you can effortlessly transform RSQL expressions or strings into MikroORM filter queries, facilitating advanced data retrieval with minimal boilerplate code.
For more details about the RSQL specification, please refer to the [FIQL read RFC about](https://datatracker.ietf.org/doc/html/draft-nottingham-atompub-fiql-00).

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Installation

You can install the library via npm:

```ts
npm install -S rsql-mikro-orm
```

## Usage

Get from expression [@rsql/builder](https://github.com/piotr-oles/rsql/tree/master/packages/builder):

```ts
import builder from '@rsql/builder';
import { rsqlExpressionToQuery } from 'rsql-mikro-orm';

// equals
rsqlExpressionToQuery(builder.eq('name', 'John'));
```

Get from string:

```ts
import { rsqlStringToQuery } from 'rsql-mikro-orm';

// equals
rsqlStringToQuery('name==John');

// greater than
rsqlStringToQuery('createdAt>1970-01-01');

// in
rsqlStringToQuery('name=in=(John,Doe)');

// like
rsqlStringToQuery('name==*John*');

// complex query
rsqlStringToQuery('title==foo*;(updated>=2024-01-01,title==*bar)');
```

## Contributing

Contributions are welcome! Please submit a pull request or open an issue to discuss your changes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
