import test from 'tape'
import common from './common.js'
import sourceMapResolve from '../index.js'

const u1 = common.u1
const u2 = common.u2
const u3 = common.u3
const u4 = common.u4
const read = common.read
const Throws = common.Throws
const identity = common.identity
const asyncify = common.asyncify

'use strict'

const map = {
  simple: {
    mappings: 'AAAA',
    sources: ['foo.js'],
    names: []
  },
  sourceRoot: {
    mappings: 'AAAA',
    sourceRoot: '/static/js/app/',
    sources: ['foo.js', 'lib/bar.js', '../vendor/dom.js', '/version.js', '//foo.org/baz.js'],
    names: []
  },
  sourceRootNoSlash: {
    mappings: 'AAAA',
    sourceRoot: '/static/js/app',
    sources: ['foo.js', 'lib/bar.js', '../vendor/dom.js', '/version.js', '//foo.org/baz.js'],
    names: []
  },
  sourceRootEmpty: {
    mappings: 'AAAA',
    sourceRoot: '',
    sources: ['foo.js', 'lib/bar.js', '../vendor/dom.js', '/version.js', '//foo.org/baz.js'],
    names: []
  },
  sourcesContent: {
    mappings: 'AAAA',
    sourceRoot: '/static/js/app/',
    sources: ['foo.js', 'lib/bar.js', '../vendor/dom.js', '/version.js', '//foo.org/baz.js'],
    sourcesContent: ['foo.js', 'lib/bar.js', '../vendor/dom.js', '/version.js', '//foo.org/baz.js'],
    names: []
  },
  mixed: {
    mappings: 'AAAA',
    sources: ['foo.js', 'lib/bar.js', '../vendor/dom.js', '/version.js', '//foo.org/baz.js'],
    sourcesContent: ['foo.js', null, null, '/version.js', '//foo.org/baz.js'],
    names: []
  },
  noSources: {
    mappings: '',
    sources: [],
    names: []
  },
  utf8: {
    mappings: 'AAAA',
    sources: ['foo.js'],
    sourcesContent: ['中文😊'],
    names: []
  },
  empty: {}
}
map.simpleString = JSON.stringify(map.simple)
map.XSSIsafe = `)]}'${map.simpleString}`

const code = {
  fileRelative: u1('foo.js.map'),
  domainRelative: u2('/foo.js.map'),
  schemeRelative: u3('//foo.org/foo.js.map'),
  absolute: u4('https://foo.org/foo.js.map'),
  dataUri: u1('data:application/json,' +
                        '%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22' +
                        'foo.js%22%5D%2C%22names%22%3A%5B%5D%7D'),
  base64: u2('data:application/json;base64,' +
                        'eyJtYXBwaW5ncyI6IkFBQUEiLCJzb3VyY2VzIjpbImZvby5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyLkuK3mlofwn5iKIl0sIm5hbWVzIjpbXX0='), // jshint ignore:line
  base64InvalidUtf8: u3('data:application/json;base64,abc'),
  dataUriText: u4('data:text/json,' +
                        '%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22' +
                        'foo.js%22%5D%2C%22names%22%3A%5B%5D%7D'),
  dataUriParameter: u1('data:application/json;charset=UTF-8;foo=bar,' +
                        '%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22' +
                        'foo.js%22%5D%2C%22names%22%3A%5B%5D%7D'),
  dataUriNoMime: u2('data:,foo'),
  dataUriInvalidMime: u3('data:text/html,foo'),
  dataUriInvalidJSON: u4('data:application/json,foo'),
  dataUriInvalidCode: u1('data:application/json,%'),
  dataUriXSSIsafe: u2('data:application/json,' + ')%5D%7D%27' +
                        '%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22' +
                        'foo.js%22%5D%2C%22names%22%3A%5B%5D%7D'),
  dataUriEmpty: u3('data:'),
  noMap: ''
}

function testResolveSourceMap (method, sync) {
  return t => {
    const wrap = (sync ? identity : asyncify)

    const codeUrl = 'http://example.com/a/b/c/foo.js'

    t.plan(1 + 12 * 3 + 8 * 4)

    t.equal(typeof method, 'function', 'is a function')

    if (sync) {
      method = asyncify(method)
    }

    let next = false
    function isAsync () { t.ok(next, 'is async') }

    method(code.fileRelative, codeUrl, wrap(read(map.simpleString)), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'foo.js.map',
        url: 'http://example.com/a/b/c/foo.js.map',
        sourcesRelativeTo: 'http://example.com/a/b/c/foo.js.map',
        map: map.simple
      }, 'fileRelative')
      isAsync()
    })

    method(code.domainRelative, codeUrl, wrap(read(map.simpleString)), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: '/foo.js.map',
        url: 'http://example.com/foo.js.map',
        sourcesRelativeTo: 'http://example.com/foo.js.map',
        map: map.simple
      }, 'domainRelative')
      isAsync()
    })

    method(code.schemeRelative, codeUrl, wrap(read(map.simpleString)), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: '//foo.org/foo.js.map',
        url: 'http://foo.org/foo.js.map',
        sourcesRelativeTo: 'http://foo.org/foo.js.map',
        map: map.simple
      }, 'schemeRelative')
      isAsync()
    })

    method(code.absolute, codeUrl, wrap(read(map.simpleString)), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'https://foo.org/foo.js.map',
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: map.simple
      }, 'absolute')
      isAsync()
    })

    method(code.dataUri, codeUrl, wrap(Throws), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'data:application/json,' +
                           '%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22' +
                           'foo.js%22%5D%2C%22names%22%3A%5B%5D%7D',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: map.simple
      }, 'dataUri')
      isAsync()
    })

    method(code.base64, codeUrl, wrap(Throws), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'data:application/json;base64,' +
                           'eyJtYXBwaW5ncyI6IkFBQUEiLCJzb3VyY2VzIjpbImZvby5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyLkuK3mlofwn5iKIl0sIm5hbWVzIjpbXX0=', // jshint ignore:line
        url: null,
        sourcesRelativeTo: codeUrl,
        map: map.utf8
      }, 'base64')
      isAsync()
    })

    method(code.base64InvalidUtf8, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'data:application/json;base64,abc',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: 'abc'
      }, 'base64InvalidUtf8 .sourceMapData')
      t.ok(error instanceof TypeError && error.message !== 'data:application/json;base64,abc',
        'base64InvalidUtf8')
      t.notOk(result)
      isAsync()
    })

    method(code.dataUriText, codeUrl, wrap(Throws), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'data:text/json,' +
                           '%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22' +
                           'foo.js%22%5D%2C%22names%22%3A%5B%5D%7D',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: map.simple
      }, 'dataUriText')
      isAsync()
    })

    method(code.dataUriParameter, codeUrl, wrap(Throws), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'data:application/json;charset=UTF-8;foo=bar,' +
                           '%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22' +
                           'foo.js%22%5D%2C%22names%22%3A%5B%5D%7D',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: map.simple
      }, 'dataUriParameter')
      isAsync()
    })

    method(code.dataUriNoMime, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'data:,foo',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: 'foo'
      }, 'dataUriNoMime .sourceMapData')
      t.ok(error.message.match(/mime type.+text\/plain/), 'dataUriNoMime')
      t.notOk(result)
      isAsync()
    })

    method(code.dataUriInvalidMime, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'data:text/html,foo',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: 'foo'
      }, 'dataUriInvalidMime .sourceMapData')
      t.ok(error.message.match(/mime type.+text\/html/), 'dataUriInvalidMime')
      t.notOk(result)
      isAsync()
    })

    method(code.dataUriInvalidJSON, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'data:application/json,foo',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: 'foo'
      }, 'dataUriInvalidJSON .sourceMapData')
      t.ok(error instanceof SyntaxError && error.message !== 'data:application/json,foo',
        'dataUriInvalidJSON')
      t.notOk(result)
      isAsync()
    })

    method(code.dataUriInvalidCode, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'data:application/json,%',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: '%'
      }, 'dataUriInvalidCode .sourceMapData')
      t.ok(error instanceof URIError && error.message !== 'data:application/json,%',
        'dataUriInvalidCode')
      t.notOk(result)
      isAsync()
    })

    method(code.dataUriXSSIsafe, codeUrl, wrap(Throws), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'data:application/json,' + ')%5D%7D%27' +
                           '%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22' +
                           'foo.js%22%5D%2C%22names%22%3A%5B%5D%7D',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: map.simple
      }, 'dataUriXSSIsafe')
      isAsync()
    })

    method(code.dataUriEmpty, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'data:',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: ''
      }, 'dataUriEmpty .sourceMapData')
      t.ok(error.message.match(/mime type.+text\/plain/), 'dataUriEmpty')
      t.notOk(result)
      isAsync()
    })

    method(code.noMap, codeUrl, wrap(Throws), (error, result) => {
      t.error(error)
      t.equal(result, null, 'noMap')
      isAsync()
    })

    method(code.absolute, codeUrl, wrap(read([map.simpleString])), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'https://foo.org/foo.js.map',
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: map.simple
      }, 'read non-string')
      isAsync()
    })

    method(code.absolute, codeUrl, wrap(read('invalid JSON')), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'https://foo.org/foo.js.map',
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: 'invalid JSON'
      }, 'read invalid JSON .sourceMapData')
      t.ok(error instanceof SyntaxError, 'read invalid JSON')
      t.notOk(result)
      isAsync()
    })

    method(code.absolute, codeUrl, wrap(read(map.XSSIsafe)), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'https://foo.org/foo.js.map',
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: map.simple
      }, 'XSSIsafe map')
      isAsync()
    })

    method(code.absolute, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'https://foo.org/foo.js.map',
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: null
      }, 'read throws .sourceMapData')
      t.equal(error.message, 'https://foo.org/foo.js.map', 'read throws')
      t.notOk(result)
      isAsync()
    })

    next = true
  }
}

test('.resolveSourceMap', testResolveSourceMap(sourceMapResolve.resolveSourceMap, false))

test('.resolveSourceMapSync', testResolveSourceMap(sourceMapResolve.resolveSourceMapSync, true))

function testResolveSources (method, sync) {
  return t => {
    const wrap = (sync ? identity : asyncify)

    const mapUrl = 'http://example.com/a/b/c/foo.js.map'

    t.plan(1 + 11 * 3 + 4)

    t.equal(typeof method, 'function', 'is a function')

    if (sync) {
      method = asyncify(method)
    }

    let next = false
    function isAsync () { t.ok(next, 'is async') }

    let options

    method(map.simple, mapUrl, wrap(identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourcesResolved: ['http://example.com/a/b/c/foo.js'],
        sourcesContent: ['http://example.com/a/b/c/foo.js']
      }, 'simple')
      isAsync()
    })

    method(map.sourceRoot, mapUrl, wrap(identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourcesResolved: [
          'http://example.com/static/js/app/foo.js',
          'http://example.com/static/js/app/lib/bar.js',
          'http://example.com/static/js/vendor/dom.js',
          'http://example.com/version.js',
          'http://foo.org/baz.js'
        ],
        sourcesContent: [
          'http://example.com/static/js/app/foo.js',
          'http://example.com/static/js/app/lib/bar.js',
          'http://example.com/static/js/vendor/dom.js',
          'http://example.com/version.js',
          'http://foo.org/baz.js'
        ]
      }, 'sourceRoot')
      isAsync()
    })

    options = { sourceRoot: false }
    method(map.sourceRoot, mapUrl, wrap(identity), options, (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourcesResolved: [
          'http://example.com/a/b/c/foo.js',
          'http://example.com/a/b/c/lib/bar.js',
          'http://example.com/a/b/vendor/dom.js',
          'http://example.com/version.js',
          'http://foo.org/baz.js'
        ],
        sourcesContent: [
          'http://example.com/a/b/c/foo.js',
          'http://example.com/a/b/c/lib/bar.js',
          'http://example.com/a/b/vendor/dom.js',
          'http://example.com/version.js',
          'http://foo.org/baz.js'
        ]
      }, 'ignore sourceRoot')
      isAsync()
    })

    options = { sourceRoot: '/static/js/' }
    method(map.sourceRoot, mapUrl, wrap(identity), options, (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourcesResolved: [
          'http://example.com/static/js/foo.js',
          'http://example.com/static/js/lib/bar.js',
          'http://example.com/static/vendor/dom.js',
          'http://example.com/version.js',
          'http://foo.org/baz.js'
        ],
        sourcesContent: [
          'http://example.com/static/js/foo.js',
          'http://example.com/static/js/lib/bar.js',
          'http://example.com/static/vendor/dom.js',
          'http://example.com/version.js',
          'http://foo.org/baz.js'
        ]
      }, 'custom sourceRoot')
      isAsync()
    })

    method(map.sourceRootNoSlash, mapUrl, wrap(identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourcesResolved: [
          'http://example.com/static/js/app/foo.js',
          'http://example.com/static/js/app/lib/bar.js',
          'http://example.com/static/js/vendor/dom.js',
          'http://example.com/version.js',
          'http://foo.org/baz.js'
        ],
        sourcesContent: [
          'http://example.com/static/js/app/foo.js',
          'http://example.com/static/js/app/lib/bar.js',
          'http://example.com/static/js/vendor/dom.js',
          'http://example.com/version.js',
          'http://foo.org/baz.js'
        ]
      }, 'sourceRootNoSlash')
      isAsync()
    })

    method(map.sourceRootEmpty, mapUrl, wrap(identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourcesResolved: [
          'http://example.com/a/b/c/foo.js',
          'http://example.com/a/b/c/lib/bar.js',
          'http://example.com/a/b/vendor/dom.js',
          'http://example.com/version.js',
          'http://foo.org/baz.js'
        ],
        sourcesContent: [
          'http://example.com/a/b/c/foo.js',
          'http://example.com/a/b/c/lib/bar.js',
          'http://example.com/a/b/vendor/dom.js',
          'http://example.com/version.js',
          'http://foo.org/baz.js'
        ]
      }, 'sourceRootEmpty')
      isAsync()
    })

    method(map.sourcesContent, mapUrl, wrap(Throws), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourcesResolved: [
          'http://example.com/static/js/app/foo.js',
          'http://example.com/static/js/app/lib/bar.js',
          'http://example.com/static/js/vendor/dom.js',
          'http://example.com/version.js',
          'http://foo.org/baz.js'
        ],
        sourcesContent: [
          'foo.js',
          'lib/bar.js',
          '../vendor/dom.js',
          '/version.js',
          '//foo.org/baz.js'
        ]
      }, 'sourcesContent')
      isAsync()
    })

    method(map.mixed, mapUrl, wrap(identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourcesResolved: [
          'http://example.com/a/b/c/foo.js',
          'http://example.com/a/b/c/lib/bar.js',
          'http://example.com/a/b/vendor/dom.js',
          'http://example.com/version.js',
          'http://foo.org/baz.js'
        ],
        sourcesContent: [
          'foo.js',
          'http://example.com/a/b/c/lib/bar.js',
          'http://example.com/a/b/vendor/dom.js',
          '/version.js',
          '//foo.org/baz.js'
        ]
      }, 'mixed')
      isAsync()
    })

    method(map.noSources, mapUrl, wrap(identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourcesResolved: [],
        sourcesContent: []
      }, 'noSources')
      isAsync()
    })

    method(map.empty, mapUrl, wrap(identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourcesResolved: [],
        sourcesContent: []
      }, 'empty')
      isAsync()
    })

    method(map.simple, mapUrl, wrap(read(['non', 'string'])), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourcesResolved: ['http://example.com/a/b/c/foo.js'],
        sourcesContent: ['non,string']
      }, 'read non-string')
      isAsync()
    })

    method(map.mixed, mapUrl, wrap(Throws), (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, [
        'http://example.com/a/b/c/foo.js',
        'http://example.com/a/b/c/lib/bar.js',
        'http://example.com/a/b/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'read throws .sourcesResolved')
      const sourcesContent = result.sourcesContent
      for (let index = 0, len = sourcesContent.length; index < len; index++) {
        const item = sourcesContent[index]
        if (item instanceof Error) {
          sourcesContent[index] = null
        }
      }
      t.deepEqual(sourcesContent, [
        'foo.js',
        null,
        null,
        '/version.js',
        '//foo.org/baz.js'
      ], 'read throws .sourcesContent')
      isAsync()
    })

    next = true
  }
}

test('.resolveSources', testResolveSources(sourceMapResolve.resolveSources, false))

test('.resolveSourcesSync', testResolveSources(sourceMapResolve.resolveSourcesSync, true))

test('.resolveSourcesSync no read', t => {
  t.plan(1)

  const mapUrl = 'http://example.com/a/b/c/foo.js.map'
  const result = sourceMapResolve.resolveSourcesSync(map.mixed, mapUrl, null)

  t.deepEqual(result, {
    sourcesResolved: [
      'http://example.com/a/b/c/foo.js',
      'http://example.com/a/b/c/lib/bar.js',
      'http://example.com/a/b/vendor/dom.js',
      'http://example.com/version.js',
      'http://foo.org/baz.js'
    ],
    sourcesContent: []
  })
})

function testResolve (method, sync) {
  return t => {
    const wrap = (sync ? identity : asyncify)
    const wrapMap = (mapFn, fn) => {
      return wrap(url => {
        if (/\.map$/.test(url)) {
          return mapFn(url)
        }
        return fn(url)
      })
    }

    const codeUrl = 'http://example.com/a/b/c/foo.js'

    t.plan(1 + 15 * 3 + 23 * 4 + 4)

    t.equal(typeof method, 'function', 'is a function')

    if (sync) {
      method = asyncify(method)
    }

    let next = false
    function isAsync () { t.ok(next, 'is async') }

    const readSimple = wrapMap(read(map.simpleString), identity)

    method(code.fileRelative, codeUrl, readSimple, (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'foo.js.map',
        url: 'http://example.com/a/b/c/foo.js.map',
        sourcesRelativeTo: 'http://example.com/a/b/c/foo.js.map',
        map: map.simple,
        sourcesResolved: ['http://example.com/a/b/c/foo.js'],
        sourcesContent: ['http://example.com/a/b/c/foo.js']
      }, 'fileRelative')
      isAsync()
    })

    method(code.domainRelative, codeUrl, readSimple, (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: '/foo.js.map',
        url: 'http://example.com/foo.js.map',
        sourcesRelativeTo: 'http://example.com/foo.js.map',
        map: map.simple,
        sourcesResolved: ['http://example.com/foo.js'],
        sourcesContent: ['http://example.com/foo.js']
      }, 'domainRelative')
      isAsync()
    })

    method(code.schemeRelative, codeUrl, readSimple, (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: '//foo.org/foo.js.map',
        url: 'http://foo.org/foo.js.map',
        sourcesRelativeTo: 'http://foo.org/foo.js.map',
        map: map.simple,
        sourcesResolved: ['http://foo.org/foo.js'],
        sourcesContent: ['http://foo.org/foo.js']
      }, 'schemeRelative')
      isAsync()
    })

    method(code.absolute, codeUrl, readSimple, (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'https://foo.org/foo.js.map',
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: map.simple,
        sourcesResolved: ['https://foo.org/foo.js'],
        sourcesContent: ['https://foo.org/foo.js']
      }, 'absolute')
      isAsync()
    })

    method(code.dataUri, codeUrl, wrapMap(Throws, identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'data:application/json,' +
                           '%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22' +
                           'foo.js%22%5D%2C%22names%22%3A%5B%5D%7D',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: map.simple,
        sourcesResolved: ['http://example.com/a/b/c/foo.js'],
        sourcesContent: ['http://example.com/a/b/c/foo.js']
      }, 'dataUri')
      isAsync()
    })

    method(code.base64, codeUrl, wrapMap(Throws, identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'data:application/json;base64,' +
                           'eyJtYXBwaW5ncyI6IkFBQUEiLCJzb3VyY2VzIjpbImZvby5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyLkuK3mlofwn5iKIl0sIm5hbWVzIjpbXX0=', // jshint ignore:line
        url: null,
        sourcesRelativeTo: codeUrl,
        map: map.utf8,
        sourcesResolved: ['http://example.com/a/b/c/foo.js'],
        sourcesContent: ['中文😊']
      }, 'base64')
      isAsync()
    })

    method(code.base64InvalidUtf8, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'data:application/json;base64,abc',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: 'abc'
      }, 'base64InvalidUtf8 .sourceMapData')
      t.ok(error instanceof TypeError && error.message !== 'data:application/json;base64,abc',
        'base64InvalidUtf8')
      t.notOk(result)
      isAsync()
    })

    method(code.dataUriText, codeUrl, wrapMap(Throws, identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'data:text/json,' +
                           '%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22' +
                           'foo.js%22%5D%2C%22names%22%3A%5B%5D%7D',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: map.simple,
        sourcesResolved: ['http://example.com/a/b/c/foo.js'],
        sourcesContent: ['http://example.com/a/b/c/foo.js']
      }, 'dataUriText')
      isAsync()
    })

    method(code.dataUriParameter, codeUrl, wrapMap(Throws, identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'data:application/json;charset=UTF-8;foo=bar,' +
                           '%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22' +
                           'foo.js%22%5D%2C%22names%22%3A%5B%5D%7D',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: map.simple,
        sourcesResolved: ['http://example.com/a/b/c/foo.js'],
        sourcesContent: ['http://example.com/a/b/c/foo.js']
      }, 'dataUriParameter')
      isAsync()
    })

    method(code.dataUriNoMime, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'data:,foo',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: 'foo'
      }, 'dataUriNoMime .sourceMapData')
      t.ok(error.message.match(/mime type.+text\/plain/), 'dataUriNoMime')
      t.notOk(result)
      isAsync()
    })

    method(code.dataUriInvalidMime, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'data:text/html,foo',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: 'foo'
      }, 'dataUriInvalidMime .sourceMapData')
      t.ok(error.message.match(/mime type.+text\/html/), 'dataUriInvalidMime')
      t.notOk(result)
      isAsync()
    })

    method(code.dataUriInvalidJSON, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'data:application/json,foo',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: 'foo'
      }, 'dataUriInvalidJSON .sourceMapData')
      t.ok(error instanceof SyntaxError && error.message !== 'data:application/json,foo',
        'dataUriInvalidJSON')
      t.notOk(result)
      isAsync()
    })

    method(code.dataUriInvalidCode, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'data:application/json,%',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: '%'
      }, 'dataUriInvalidCode .sourceMapData')
      t.ok(error instanceof URIError && error.message !== 'data:application/json,%',
        'dataUriInvalidCode')
      t.notOk(result)
      isAsync()
    })

    method(code.dataUriXSSIsafe, codeUrl, wrapMap(Throws, identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'data:application/json,' + ')%5D%7D%27' +
                           '%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22' +
                           'foo.js%22%5D%2C%22names%22%3A%5B%5D%7D',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: map.simple,
        sourcesResolved: ['http://example.com/a/b/c/foo.js'],
        sourcesContent: ['http://example.com/a/b/c/foo.js']
      }, 'dataUriXSSIsafe')
      isAsync()
    })

    method(code.dataUriEmpty, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'data:',
        url: null,
        sourcesRelativeTo: codeUrl,
        map: ''
      }, 'dataUriEmpty .sourceMapData')
      t.ok(error.message.match(/mime type.+text\/plain/), 'dataUriEmpty')
      t.notOk(result)
      isAsync()
    })

    method(code.noMap, codeUrl, wrap(Throws), (error, result) => {
      t.error(error)
      t.equal(result, null, 'noMap')
      isAsync()
    })

    method(code.absolute, codeUrl, wrap(read([map.simpleString])), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'https://foo.org/foo.js.map',
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: map.simple,
        sourcesResolved: ['https://foo.org/foo.js'],
        sourcesContent: [map.simpleString]
      }, 'read non-string')
      isAsync()
    })

    method(code.absolute, codeUrl, wrap(read('invalid JSON')), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'https://foo.org/foo.js.map',
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: 'invalid JSON'
      }, 'read invalid JSON .sourceMapData')
      t.ok(error instanceof SyntaxError, 'read invalid JSON')
      t.notOk(result)
      isAsync()
    })

    method(code.absolute, codeUrl, wrapMap(read(map.XSSIsafe), identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'https://foo.org/foo.js.map',
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: map.simple,
        sourcesResolved: ['https://foo.org/foo.js'],
        sourcesContent: ['https://foo.org/foo.js']
      }, 'XSSIsafe map')
      isAsync()
    })

    method(code.absolute, codeUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: 'https://foo.org/foo.js.map',
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: null
      }, 'read throws .sourceMapData')
      t.equal(error.message, 'https://foo.org/foo.js.map', 'read throws')
      t.notOk(result)
      isAsync()
    })

    function readMap (what) {
      return wrapMap(read(JSON.stringify(what)), identity)
    }

    let options

    method(code.fileRelative, codeUrl, readMap(map.simple), (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, ['http://example.com/a/b/c/foo.js'], 'simple')
      t.deepEqual(result.sourcesContent, ['http://example.com/a/b/c/foo.js'], 'simple')
      isAsync()
    })

    method(code.fileRelative, codeUrl, readMap(map.sourceRoot), (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, [
        'http://example.com/static/js/app/foo.js',
        'http://example.com/static/js/app/lib/bar.js',
        'http://example.com/static/js/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'sourceRoot')
      t.deepEqual(result.sourcesContent, [
        'http://example.com/static/js/app/foo.js',
        'http://example.com/static/js/app/lib/bar.js',
        'http://example.com/static/js/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'sourceRoot')
      isAsync()
    })

    options = { sourceRoot: false }
    method(code.fileRelative, codeUrl, readMap(map.sourceRoot), options, (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, [
        'http://example.com/a/b/c/foo.js',
        'http://example.com/a/b/c/lib/bar.js',
        'http://example.com/a/b/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'ignore sourceRoot')
      t.deepEqual(result.sourcesContent, [
        'http://example.com/a/b/c/foo.js',
        'http://example.com/a/b/c/lib/bar.js',
        'http://example.com/a/b/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'ignore sourceRoot')
      isAsync()
    })

    options = { sourceRoot: '/static/js/' }
    method(code.fileRelative, codeUrl, readMap(map.sourceRoot), options, (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, [
        'http://example.com/static/js/foo.js',
        'http://example.com/static/js/lib/bar.js',
        'http://example.com/static/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'custom sourceRoot')
      t.deepEqual(result.sourcesContent, [
        'http://example.com/static/js/foo.js',
        'http://example.com/static/js/lib/bar.js',
        'http://example.com/static/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'custom sourceRoot')
      isAsync()
    })

    method(code.fileRelative, codeUrl, readMap(map.sourceRootNoSlash), (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, [
        'http://example.com/static/js/app/foo.js',
        'http://example.com/static/js/app/lib/bar.js',
        'http://example.com/static/js/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'sourceRootNoSlash')
      t.deepEqual(result.sourcesContent, [
        'http://example.com/static/js/app/foo.js',
        'http://example.com/static/js/app/lib/bar.js',
        'http://example.com/static/js/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'sourceRootNoSlash')
      isAsync()
    })

    method(code.fileRelative, codeUrl, readMap(map.sourceRootEmpty), (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, [
        'http://example.com/a/b/c/foo.js',
        'http://example.com/a/b/c/lib/bar.js',
        'http://example.com/a/b/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'sourceRootEmpty')
      t.deepEqual(result.sourcesContent, [
        'http://example.com/a/b/c/foo.js',
        'http://example.com/a/b/c/lib/bar.js',
        'http://example.com/a/b/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'sourceRootEmpty')
      isAsync()
    })

    method(code.fileRelative, codeUrl, readMap(map.sourcesContent), (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, [
        'http://example.com/static/js/app/foo.js',
        'http://example.com/static/js/app/lib/bar.js',
        'http://example.com/static/js/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'sourcesContent')
      t.deepEqual(result.sourcesContent, [
        'foo.js',
        'lib/bar.js',
        '../vendor/dom.js',
        '/version.js',
        '//foo.org/baz.js'
      ], 'sourcesContent')
      isAsync()
    })

    method(code.fileRelative, codeUrl, readMap(map.mixed), (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, [
        'http://example.com/a/b/c/foo.js',
        'http://example.com/a/b/c/lib/bar.js',
        'http://example.com/a/b/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'mixed')
      t.deepEqual(result.sourcesContent, [
        'foo.js',
        'http://example.com/a/b/c/lib/bar.js',
        'http://example.com/a/b/vendor/dom.js',
        '/version.js',
        '//foo.org/baz.js'
      ], 'mixed')
      isAsync()
    })

    method(code.fileRelative, codeUrl, readMap(map.noSources), (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, [], 'noSources')
      t.deepEqual(result.sourcesContent, [], 'noSources')
      isAsync()
    })

    method(code.fileRelative, codeUrl, readMap(map.empty), (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, [], 'noSources')
      t.deepEqual(result.sourcesContent, [], 'noSources')
      isAsync()
    })

    method(code.fileRelative, codeUrl, wrap(read([map.simpleString])), (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, ['http://example.com/a/b/c/foo.js'], 'read non-string')
      t.deepEqual(result.sourcesContent, [map.simpleString], 'read non-string')
      isAsync()
    })

    function ThrowsMap (what) {
      return wrapMap(read(JSON.stringify(what)), Throws)
    }

    method(code.fileRelative, codeUrl, ThrowsMap(map.mixed), (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, [
        'http://example.com/a/b/c/foo.js',
        'http://example.com/a/b/c/lib/bar.js',
        'http://example.com/a/b/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'read throws .sourcesResolved')
      const sourcesContent = result.sourcesContent
      for (let index = 0, len = sourcesContent.length; index < len; index++) {
        const item = sourcesContent[index]
        if (item instanceof Error) {
          sourcesContent[index] = null
        }
      }
      t.deepEqual(sourcesContent, [
        'foo.js',
        null,
        null,
        '/version.js',
        '//foo.org/baz.js'
      ], 'read throws .sourcesContent')
      isAsync()
    })

    let mapUrl = 'https://foo.org/foo.js.map'

    method(null, mapUrl, readSimple, (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: null,
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: map.simple,
        sourcesResolved: ['https://foo.org/foo.js'],
        sourcesContent: ['https://foo.org/foo.js']
      }, 'mapUrl simple')
      isAsync()
    })

    method(null, mapUrl, wrap(read([map.simpleString])), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: null,
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: map.simple,
        sourcesResolved: ['https://foo.org/foo.js'],
        sourcesContent: [map.simpleString]
      }, 'mapUrl read non-string')
      isAsync()
    })

    method(null, mapUrl, wrap(read('invalid JSON')), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: null,
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: 'invalid JSON'
      }, 'mapUrl read invalid JSON .sourceMapData')
      t.ok(error instanceof SyntaxError, 'mapUrl read invalid JSON')
      t.notOk(result)
      isAsync()
    })

    method(null, mapUrl, wrapMap(read(map.XSSIsafe), identity), (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: null,
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: map.simple,
        sourcesResolved: ['https://foo.org/foo.js'],
        sourcesContent: ['https://foo.org/foo.js']
      }, 'mapUrl XSSIsafe map')
      isAsync()
    })

    method(null, mapUrl, wrap(Throws), (error, result) => {
      t.deepEqual(error.sourceMapData, {
        sourceMappingURL: null,
        url: 'https://foo.org/foo.js.map',
        sourcesRelativeTo: 'https://foo.org/foo.js.map',
        map: null
      }, 'mapUrl read throws .sourceMapData')
      t.equal(error.message, 'https://foo.org/foo.js.map', 'mapUrl read throws')
      t.notOk(result)
      isAsync()
    })

    mapUrl = 'http://example.com/a/b/c/foo.js.map'

    options = { sourceRoot: '/static/js/' }
    method(null, mapUrl, readMap(map.sourceRoot), options, (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, [
        'http://example.com/static/js/foo.js',
        'http://example.com/static/js/lib/bar.js',
        'http://example.com/static/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'mapUrl custom sourceRoot')
      t.deepEqual(result.sourcesContent, [
        'http://example.com/static/js/foo.js',
        'http://example.com/static/js/lib/bar.js',
        'http://example.com/static/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'mapUrl custom sourceRoot')
      isAsync()
    })

    method(null, mapUrl, readMap(map.mixed), (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, [
        'http://example.com/a/b/c/foo.js',
        'http://example.com/a/b/c/lib/bar.js',
        'http://example.com/a/b/vendor/dom.js',
        'http://example.com/version.js',
        'http://foo.org/baz.js'
      ], 'mapUrl mixed')
      t.deepEqual(result.sourcesContent, [
        'foo.js',
        'http://example.com/a/b/c/lib/bar.js',
        'http://example.com/a/b/vendor/dom.js',
        '/version.js',
        '//foo.org/baz.js'
      ], 'mapUrl mixed')
      isAsync()
    })

    next = true
  }
}

test('.resolve', testResolve(sourceMapResolve.resolve, false))

test('.resolveSync', testResolve(sourceMapResolve.resolveSync, true))

test('.parseMapToJSON', t => {
  t.plan(1)
  t.deepEqual(sourceMapResolve.parseMapToJSON(map.XSSIsafe), map.simple)
})
