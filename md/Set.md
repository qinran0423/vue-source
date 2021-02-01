## 检测数据变化

### 给对象添加属性

```js
const app = new Vue({
    el: "#app",
    data: {
        obj: {
        },
        arr: []
    },
    created() {
        this.obj.foo = 'fooooooooooooo'
    },
});
```

Object.defineProperty 实现完成响应式对象，当我们给这个对象添加一个新的属性的时候，不能触发他的setter

### set

```js
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  //  判断是否是数组
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 安全手段 
    // 如果key是一个有效的索引值，就先设置length属性
    // 如果索引值大于当前数组的length，就需要让target的length等于索引值
    target.length = Math.max(target.length, key)
    // 替换操作
    target.splice(key, 1, val)
    return val
  }

  // 对象 如果key已经在对象中，说明已经是响应式的了 直接赋值
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }

  // 新增
  // 获取__ob__属性
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 判断ob是否存在，即判断是否是响应式的
  if (!ob) {
    target[key] = val
    return val
  }
  // 定义响应式的数据（核心）
  defineReactive(ob.value, key, val)
  // 立即通知组件更新
  ob.dep.notify()
  return val
}

```



target: 数组或者是普通对象  key: 数组的下标或者对象的键值  val: 添加的值

#### target 是数组

```js
//  判断是否是数组
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 安全手段 
    // 如果key是一个有效的索引值，就先设置length属性
    // 如果索引值大于当前数组的length，就需要让target的length等于索引值
    target.length = Math.max(target.length, key)
    // 替换操作
    target.splice(key, 1, val)
    return val
  }

```

 如果key是一个有效的索引值，就先设置length属性 如果索引值大于当前数组的length，就需要让target的length等于索引值

splice 替换

#### target 是对象

##### 如果key 在对象中

此时说明这个key已经是响应式的了， 所以直接赋值 并且返回

```js
if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
```

##### 如果key不在对象中说明是新增

```js
const ob = (target: any).__ob__
if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
        'Avoid adding reactive properties to a Vue instance or its root $data ' +
        'at runtime - declare it upfront in the data option.'
    )
    return val
}
// 判断ob是否存在，即判断是否是响应式的
if (!ob) {
    target[key] = val
    return val
}
// 定义响应式的数据（核心）
defineReactive(ob.value, key, val)
// 立即通知组件更新
ob.dep.notify()
return val
```

判断是否是响应式的，如果不是响应式的，对目标对象赋值，并返回

如果是响应式的，则通过defineReactive 吧key添加并变成响应式，接着通知组件更新

