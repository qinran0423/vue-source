/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */

  //  每个继承Vue的对象都有唯一的cid
  // 首先给Vue添加了一个cid，它的值为0，之后每次通过Vue.extend创建的子类的cid值依次递增
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */

  //  接收一个对象
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    // 保存当前对象，这里是Vue本身
    const Super = this
    // Vue.cid 即0
    const SuperId = Super.cid
    // extendOptions._Ctor用于缓存构造函数
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }


    // 定义对象Sub, 并添加一系列的全局方法
    const Sub = function VueComponent (options) {
      this._init(options)
    }
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    // cid递增
    Sub.cid = cid++
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )

    // 新增
    // 指向父级构造函数
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps(Sub)
    }
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.

    // 新增
    Sub.superOptions = Super.options // 父级构造函数的optinos
    Sub.extendOptions = extendOptions //传入的extendOptions
    Sub.sealedOptions = extend({}, Sub.options) // 保存定义Sub时,它的options值有哪些

    // cache constructor
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
