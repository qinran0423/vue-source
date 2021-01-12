/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

// nodeOps -> 封装了一系列DOM操作的方法
// modules -> 定义了一些模块的钩子函数的实现
export const patch: Function = createPatchFunction({ nodeOps, modules })
