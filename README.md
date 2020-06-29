# generate-graphql-operations
Generates GraphQL queries/mutations/subscriptions (gql files) based on a GraphQL schema

Currently it only supports typescript imports

### Intallation
`npm i generate-graphql-operations`

### Usage
`generate-gql-ops --path [path_of_generated_file] --url [url_of_graphql_server]`

OR (untested)
`generate-gql-ops --path [path_of_generated_file] --file [schema_file_in_json_or_graphql]`
