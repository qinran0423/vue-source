组件在初始化的时候会首先new Watcher 传入了回调函数去执行视图渲染

```js
this.value = this.lazy
      ? undefined
      : this.get()
```

这里会先执行get方法

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

执行了pushTarget 这个方法在Dep 中

```js
export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}
```

首先讲当前的watcher 推入targetStack中，讲全局的Dep.target 设置为当前的渲染Watcher

this.getter就是传入了的回调函数

```js
updateComponent = () => {
      vm._update(vm._render(), hydrating)
    }
```

这里会通过```__render``` 把render函数变成vnode,  ```__update```会把vnode 变成真实的dom插入视图

__render 会访问我们的数据，就会触发object.defineproperty中的get去收集依赖

```js
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 小管家: 每个key一个
  const dep = new Dep()
  
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 如果val是对象还会递归它
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      // 依赖收集
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          // 如果存在对象嵌套,则存在子的Ob实例,需要建立大管家和当前watcher之间的关系
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal)
      dep.notify()
    }
  })
}
```

可以看到每一个key都会对应一个dep, 触发了get 执行 dep.depend()

```js
depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }
```

Dep.target就是当前的渲染watcher,然后触发watcher的addDep

```js
addDep (dep: Dep) {
    const id = dep.id
    // 如果没有建立和dep之间关系
    if (!this.newDepIds.has(id)) {
      // 则建立watcher和dep关系
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      // 反向建立dep和watcher关系
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }
```

我们理解的是只需要将dep中的sub数组收集对应的watcher即可，但是为什么这个复杂呢？

这个有两个数组newDepIds 和 newDeps，newDepIds将watcher对应的dep的id收集，newDeps将watcherd对应的dep收集，才是将dep中的sub数组收集对应的watcher。为什么会有上面这一步呢？

主要是为了清除watcher

在get方法中每一次执行完渲染之后会执行如下：

```js
popTarget()
this.cleanupDeps()
```

```js
export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
```

这里将之前推入的watcher移出，并回复上一层watcher。因为很有可能有子组件当渲染子组件的时，Watcher就是子组件的Watcher,渲染完成就要回退他上一级父组件的Watcher

```js
cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this) // 移除对dep.subs数组中Watcher的订阅
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }
```

this.deps代表上一次收集的dep, this.newDep代表新收集的dep。这里首先会对this.deps进行遍历，判断新收集的newDepIds中是否有dep对应的id。 如果没有则移出当前的watcher。因为当数据修改的时候 除了set 此时也要再去收集一次依赖，这时候很有可能某个值对应的组件不需要显示了，所以这个值的依赖就不需要再次收集了。所以就不需要去渲染这个watcher