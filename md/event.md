# 事件处理机制

```js
 <body>
    <div id="app">
      <h1>事件处理机制</h1>
      <!-- 普通事件 -->
      <p class="pname" v-if="foo" @click="onClick" >{{foo}}</p>

      <!-- 自定义事件 -->
      <comp @myclick="onClick"/>
    </div>
  </body>
  <script>
    Vue.component('comp', {
      template: `<div @click="$emit('myclick')">this is comp</div>`
    })

    const app = new Vue({
      el: "#app",
      data: {
        foo: 'foo',
      },
      methods: {
        onClick() {
          console.log('普通事件')
        }
      },
    });
    console.log(app.$options.render)
  </script>
```

```js
(function anonymous() {
    with(this) {
        return _c('div', {
            attrs: {
                "id": "app"
            }
        },
        [_c('h1', [_v("事件处理机制")]), _v(" "), (foo) ? _c('p', {
            staticClass: "pname",
            on: {
                "click": onClick
            }
        },
        [_v(_s(foo))]) : _e(), _v(" "), _c('comp', {
            on: {
                "myclick": onClick
            }
        })], 1)
    }
})
```



## Dom事件

首先说一下dom事件

在执行patch的时候，会执行创建元素方法createElm()\

```js
function createElm (
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm,
    nested,
    ownerArray,
    index
  ) {
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // This vnode was used in a previous render!
      // now it's used as a new node, overwriting its elm would cause
      // potential patch errors down the road when it's used as an insertion
      // reference node. Instead, we clone the node on-demand before creating
      // associated DOM element for it.
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    vnode.isRootInsert = !nested // for transition enter check
    // 自定义组件的处理
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }

    // 下面处理保留标签
    const data = vnode.data
    const children = vnode.children
    const tag = vnode.tag
    if (isDef(tag)) {
      // 创建原生元素
      vnode.elm = vnode.ns
        ? nodeOps.createElementNS(vnode.ns, tag)
        : nodeOps.createElement(tag, vnode)
      setScope(vnode)

        // 父节点创建完成，紧接着创建子节点
        createChildren(vnode, children, insertedVnodeQueue)
        if (isDef(data)) {
          // 如果有data定义，里面就会有事件相关的属性操作
          invokeCreateHooks(vnode, insertedVnodeQueue)
        }

        // 插入子节点
        insert(parentElm, vnode.elm, refElm)
      

      if (process.env.NODE_ENV !== 'production' && data && data.pre) {
        creatingElmInVPre--
      }
    } else if (isTrue(vnode.isComment)) {
      vnode.elm = nodeOps.createComment(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    } else {
      vnode.elm = nodeOps.createTextNode(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    }
  }
```

重点这一步

```js
if (isDef(data)) {
          // 如果有data定义，里面就会有事件相关的属性操作
          invokeCreateHooks(vnode, insertedVnodeQueue)
        }
```

```js
 function invokeCreateHooks (vnode, insertedVnodeQueue) {
    // 执行所有的回调
    for (let i = 0; i < cbs.create.length; ++i) {
      cbs.create[i](emptyNode, vnode)
    }
    i = vnode.data.hook // Reuse variable
    if (isDef(i)) {
      if (isDef(i.create)) i.create(emptyNode, vnode)
      if (isDef(i.insert)) insertedVnodeQueue.push(vnode)
    }
  }
```

执行上面的循环，当i 为2的时候 是处理事件的

```js
// 对于事件的监听
function updateDOMListeners (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return
  }
  const on = vnode.data.on || {}
  const oldOn = oldVnode.data.on || {}
  target = vnode.elm
  normalizeEvents(on)
  updateListeners(on, oldOn, add, remove, createOnceHandler, vnode.context)
  target = undefined
}
```

执行了updateListeners

```js

export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  createOnceHandler: Function,
  vm: Component
) {
  let name, def, cur, old, event
  for (name in on) {
    def = cur = on[name]
    old = oldOn[name]
    event = normalizeEvent(name)

    if (isUndef(cur)) {
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    } else if (isUndef(old)) {
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur, vm)
      }
      if (isTrue(event.once)) {
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      add(event.name, cur, event.capture, event.passive, event.params)
    } else if (cur !== old) {
      old.fns = cur
      on[name] = old
    }
  }
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
```

比较关键的一步在于add()

```js
function add (
  name: string,
  handler: Function,
  capture: boolean,
  passive: boolean
) {
 
  target.addEventListener(
    name,
    handler,
    supportsPassive
      ? { capture, passive }
      : capture
  )
}
```

可以看到对dom执行了 addEventListener的事件监听





## 自定义事件

在render的时候如果是自定义组件则会执行createComponent创建一个组件vnode

```js
export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | Array<VNode> | void {
  // ...
  const listeners = data.on
  
  data.on = data.nativeOn
  
  // ...
  const name = Ctor.options.name || tag
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )

  return vnode
}
```

会把data.on 赋值给listeners, data.nativeOn赋值给data.on

自定义组件在初始化init时会执行initInternalComponent

```js
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  // 这个options是全局选项和组件设置选项的合集
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  // 传给组件选项_renderChildren
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}
```

opts._parentListeners就是上面data.on赋值的listeners

接着会执行initEvents

```js
export function initEvents (vm: Component) {
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}
```

把listeners传给updateComponentListeners并执行

```js
let target: any
export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove, vm)
  target = undefined
}
```

然后会执行updateListeners

```js
export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  vm: Component
) {
  let name, def, cur, old, event
  for (name in on) {
    def = cur = on[name]
    old = oldOn[name]
    event = normalizeEvent(name)
    /* istanbul ignore if */
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }
    if (isUndef(cur)) {
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    } else if (isUndef(old)) {
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur)
      }
      add(event.name, cur, event.once, event.capture, event.passive, event.params)
    } else if (cur !== old) {
      old.fns = cur
      on[name] = old
    }
  }
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
```

接着也会执行add

此时执行的add是

```js
function add (event, fn) {
  target.$on(event, fn)
}
```

```js
 Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        this.$on(event[i], fn)
      }
    } else {
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }
```

当执行 `vm.$on(event,fn)` 的时候，按事件的名称 `event` 把回调函数 `fn` 存储起来 `vm._events[event].push(fn)`当执行 `vm.$emit(event)` 的时候，根据事件名 `event` 找到所有的回调函数 `let cbs = vm._events[event]`，然后遍历执行所有的回调函数。

```js
Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      for (let i = 0, l = cbs.length; i < l; i++) {
        try {
          cbs[i].apply(vm, args)
        } catch (e) {
          handleError(e, vm, `event handler for "${event}"`)
        }
      }
    }
    return vm
  }
```

当执行 `vm.$off(event,fn)` 的时候会移除指定事件名 `event` 和指定的 `fn`

```js
Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // array of events
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        this.$off(event[i], fn)
      }
      return vm
    }
    // specific event
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    if (fn) {
      // specific handler
      let cb
      let i = cbs.length
      while (i--) {
        cb = cbs[i]
        if (cb === fn || cb.fn === fn) {
          cbs.splice(i, 1)
          break
        }
      }
    }
    return vm
  }
```

当执行 `vm.$once(event,fn)` 的时候，内部就是执行 `vm.$on`，并且当回调函数执行一次后再通过 `vm.$off` 移除事件的回调，这样就确保了回调函数只执行一次。

```js
Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    vm.$on(event, on)
    return vm
  }
```