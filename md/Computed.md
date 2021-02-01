在initStats中对computed进行初始化



```js
const computedWatcherOptions = { lazy: true }
function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  // 创建一个空对象
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  //!有可能这样写
  // computed: {
  //   fullName: {
  //     // getter
  //     get: function () {
  //       return this.firstName + ' ' + this.lastName
  //     },
  //     // setter
  //     set: function (newValue) {
  //       var names = newValue.split(' ')
  //       this.firstName = names[0]
  //       this.lastName = names[names.length - 1]
  //     }
  //   }
  // }
  // 对computed对象进行遍历
  for (const key in computed) {
    // 拿到计算属性中的每一个值
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    if (!isSSR) {
      // create internal watcher for the computed property.
      // 为每一个key创建watcher
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    // 判断key是不是vm的属性
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}
```

首先创建一个空对象，对computed进行遍历，获取key对应的值 判断是否是function。 如果是，则赋值给getter,如果不是则拿到值中的get函数。随后对每一个key创建一个Watcher,并传入了getter.最后判断如果key不是vm的属性，则执行defineComputed

```js
export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  // 给key添加geter和setter
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
```

这里就是通过Object,defineproperty给对应的key添加get set

```js

function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}
```

当出发get的时候则执行createComputedGetter方法。首先获取key对应的watcher, 

看下watcher

```js
 this.dirty = this.lazy 
```

首次进入dirty 为true

当访问时，触发get，则触发createComputedGetter，则触发watcher.evaluate.

```js
evaluate () {
    this.value = this.get()
    this.dirty = false
}
```

value则是key 对应的函数，然后计算。紧接着就把dirty设置为false