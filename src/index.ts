#!/usr/bin/env node

import { GraphQLSchema, GraphQLFieldMap, print } from 'graphql'
import { buildOperationNodeForField } from '@graphql-tools/utils'
import { UrlLoader } from '@graphql-tools/url-loader'
import { JsonFileLoader } from '@graphql-tools/json-file-loader'
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { loadSchema } from '@graphql-tools/load'
import * as fs from 'fs'
import * as yargs from 'yargs'
import { resolve as pathResolve } from 'path'

// yargs command options config
const { path, url, file } = yargs.options({
  path: { type: 'string', alias: 'p', demandOption: true },
  url: { type: 'string' },
  file: { type: 'string' }
}).check((argv, options) => {
  return true
}).argv;

(async () => {
  // load schema
  const schema = await loadSchema(url || file, {
    loaders: [
      new UrlLoader(),
      new JsonFileLoader(),
      new GraphQLFileLoader()
    ]
  })

  // clean dir
  cleanDir(pathResolve(path))

  // get operations fields
  const mutations = schema.getMutationType()?.getFields()
  const queries = schema.getQueryType()?.getFields()
  const subscriptions = schema.getSubscriptionType()?.getFields()

  // generate files
  const promisses: Array<Promise<void>> = []
  mutations && promisses.push(generateFilesForFields(schema, mutations, 'mutation'))
  queries && promisses.push(generateFilesForFields(schema, queries, 'query'))
  subscriptions && promisses.push(generateFilesForFields(schema, subscriptions, 'subscription'))
  await Promise.all(promisses)
})()

async function generateFilesForFields(schema: GraphQLSchema, obj: GraphQLFieldMap<any, any>, kind: 'query' | 'mutation' | 'subscription') {
  const promisses: Array<Promise<{ field: string, file: string }>> = []
  const opsPath = `${pathResolve(path)}/${kind === 'query' ? 'queries' : kind === 'mutation' ? 'mutations' : 'subscriptions'}`

  // create operations directory if it doesnt exit
  if (!fs.existsSync(opsPath)) {
    fs.mkdirSync(opsPath)
  }

  // loop through each operation and create graphql file
  Object.keys(obj).forEach(field => {
    promisses.push(new Promise(resolve => {
      const ops = buildOperationNodeForField({ schema, kind, field })
      const file = `${opsPath}/${field}.graphql`
      const content = `${print(ops).replace(/^([\t\s]*)((?!\().)*(:\s)/gm, '$1').replace(/(\$\w)/g, (s) => s.toLowerCase())}`
      fs.writeFile(file, content, () => resolve({ field: field.replace(/\.?([A-Z]+)/g, (x, y) => '_' + y).replace(/^_/, '').toUpperCase(), file }))
    }))
  })

  // create import file for operations
  const files = await Promise.all(promisses)
  const lines = files.map(({ field, file }) => `export const ${field} = loader('${file.replace(opsPath, '.')}')`).join(`\r\n`)
  fs.writeFileSync(`${opsPath}/index.ts`, `import { loader } from 'graphql.macro'\r\n${lines}`)
}

function cleanDir(dirPath: string, removeSelf = false) {
  if (fs.existsSync(dirPath)) {
    try { var files = fs.readdirSync(dirPath) }
    catch (e) { return }
    if (files.length > 0)
      for (var i = 0; i < files.length; i++) {
        var filePath = dirPath + '/' + files[i]
        if (fs.statSync(filePath).isFile())
          fs.unlinkSync(filePath)
        else
          cleanDir(filePath, true)
      }
    removeSelf && fs.rmdirSync(dirPath)
  } else {
    fs.mkdirSync(dirPath)
  }
}
