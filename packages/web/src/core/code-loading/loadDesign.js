// loading
const isCommonJsModule = require('@jscad/core/code-loading/isCommonJsModule')
const modulifySource = require('../code-loading/modulifySource')
const requireDesignFromModule = require('@jscad/core/code-loading/requireDesignFromModule')
const getAllParameterDefintionsAndValues = require('@jscad/core/parameters/getParameterDefinitionsAndValues')
const transformSources = require('./sourceTransforms')

// taken verbatim from https://github.com/iliakan/detect-node
// return true if we are are in node/ env that has require()
const hasRequire = () => Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]'
const makeWebRequire = require('./webRequire')

/** load a jscad script, injecting the basic dependencies if necessary
 * @param  {} filePath
 * @param  {} csgBasePath='../../../../core/tmp/csg.js : relative path or  '@jscad/csg'
 */
const loadDesign = (source, mainPath, apiMainPath, parameterValuesOverride, filesAndFolders) => {
  // the root script is the main entry point in a design
  // ie either the only file if there is only one
  // OR the file in the 'main' entry of package.js, index.js, main.js or <folderName>.js

  const designRoot = {source, path: mainPath, module: undefined}

  // now attempt to load the design
  /*
    - if the script is a common.js file already
      > load as it is
        - if we have real require() access (CLI, desktop)
          use standard require() to load the rootScript
        - if we do NOT have real require() access (web)
          use fake require() to load the rootScript
    - if the script is NOT a common.js file (implicit imports)
      > add explicit api imports to the rootScript's source
      > add explicit exports ie module.exports {main, getParameterDefinitions}
        - if we have real require() access (CLI, desktop)
          use standard require() to load the rootScript
        - if we do NOT have real require() access (web)
          use fake require() to load the rootScript
  */

  // make sure we always deal with a commonJs module
  // const isDesignCommonJs = isCommonJsModule(designRoot.source)
  // designRoot.source = !isDesignCommonJs ? modulifySource(designRoot.source, apiMainPath) : designRoot.source

  // if we have files & folders we need to update the source for our module
  if (filesAndFolders) {
    filesAndFolders = transformSources({apiMainPath}, filesAndFolders)
  }
  // now check if we need fake require or not
  const requireFn = hasRequire() ? require : makeWebRequire(filesAndFolders, {apiMainPath})
  const rootModule = requireDesignFromModule(designRoot.path, requireFn)
  // const requireUncached = require('../code-loading/requireUncached')
  // TODO: only uncache when needed
  // requireUncached(mainPath)

  // the design (module tree) has been loaded at this stage
  // now we can get our usefull data
  const parameters = getAllParameterDefintionsAndValues(rootModule)
  const parameterDefinitions = parameters.parameterDefinitions
  const parameterDefaults = parameters.parameterValues
  const parameterValues = Object.assign({}, parameters.parameterValues, parameterValuesOverride)

  // console.log('parameters', parameterDefinitions, parameterValues, parameterDefaults)
  return {rootModule, parameterDefaults, parameterValues, parameterDefinitions}
}

module.exports = loadDesign