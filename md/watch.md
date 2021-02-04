```js
if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
```

执行initWatch

```js
function initWatch (vm: Component, watch: Object) {
  // 遍历watch的所有属性
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      // 创建watcher
      createWatcher(vm, key, handler)
    }
  }
}
```

遍历watch中所有的key,并获取key对应的值，判断值是否是数组

首先不考虑数组的情况

```js
function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  // 判断是否是对象
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  // 判断是否是字符串
  if (typeof handler === 'string') {
    handler = vm[handler]
  }

  return vm.$watch(expOrFn, handler, options)
}
```

考虑到我们在watch的两种情况

```js
data: {
    num: 1,
    obj: {
       age: 20
    }
},
watch: {
    num(newval, oldval) {
        ······
    },
    obj: {
        deep: true,
        handler(newval, oldval) {
            
        }
    }
}
```

如果是对象的形式，则回去对象中的handler函数，如果是字符串，则直接将handler赋值

### 第一种

这里第一种方式既不是对象，也不是字符串 

执行了vm.$watch

在stateMixin中

```js
Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
    // 判断cb是否是对象
    if (isPlainObject(cb)) {
      //创建watcher
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    // 用户选项
    options.user = true
    // 直接new watcher
    const watcher = new Watcher(vm, expOrFn, cb, options)
    // 立即执行选项
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    // 返回取消监听的函数
    return function unwatchFn () {
      watcher.teardown()
    }
  }
```

expOrFn: key 

cb：handler

options： 对象的属性

这里首先判断cb是否是一个对象，如果是则执行createWatcher,如果不是则执行new Watcher
options.user = true 表示这是一个user watcher 

在watcher当中

```js
if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
      }
    }
```

由于expOrFn 不是function  而是key num 执行parsePath(expOrFn)

```js
export function parsePath (path: string): any {
  if (bailRE.test(path)) {
    return
  }
  const segments = path.split('.')
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}

```

首先我们的key 进行切割 ['num']

返回一个函数 这个函数就是watcher中的getter

当执行get的时候 就是执行value = this.getter.call(vm, vm),此时这个函数遍历切割后的数组，拿到了vm['num']也就是1 返回，因为我们访问了num 所以num的dep会收集这个watcher

#### 数据发生了而变化

数据发生了变化就会触发set 执行dep中所有的watcher执行run方法

```js
run () {
    if (this.active) {
      
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        // 保存旧的值
        const oldValue = this.value
        // 设置新的值
        this.value = value
        // 判断是user wathcer
        if (this.user) {
          try {
            // 执行回调函数
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }
```

这里首先调动this.get 获取最新的值，然后对之前的值进行保存，在对this.value赋值最新的值。最后执行this.cb 传入新的value 和老的value

### 第二种 深度监听

当new watcher时 执行了get 

```js
get () {
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  } 
```

这时this.getter 只是访问了vm['obj'] 并没有和obj内部建立联系 所以需要加上一个deep

判断了deep是否存在 然后执行traverse(value)

```js
export function traverse (val: any) {
  _traverse(val, seenObjects)
  seenObjects.clear()
}

function _traverse (val: any, seen: SimpleSet) {
  let i, keys
  const isA = Array.isArray(val)
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return
  }
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}
```



