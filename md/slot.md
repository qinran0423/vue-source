# Slot

### template

```js
<body>
    <div id="app">
      <h1>插槽处理机制</h1>
      <comp>
        <h1 slot="header">header</h1>
        <h3>ssssss</h3>
        <p slot="footer">footer</p>
      </comp>
    </div>
  </body>
  <script>
     Vue.component('comp',  {
        template: '<div class="container">' +
  '<header><slot name="header"></slot></header>' +
  '<main><slot>默认内容</slot></main>' +
  '<footer><slot name="footer"></slot></footer>' +
  '</div>',
      })
    const app = new Vue({
      el: "#app",
    });
    console.log(app.$options.render);

    // 1.插槽内容怎么解析
    // 2.插槽如何插到子页面
```



render

```js
(function anonymous() {
    with(this) {
        return _c('div', {
            attrs: {
                "id": "app"
            }
        },
        [_c('h1', [_v("插槽处理机制")]), _v(" "), _c('comp', [_c('h1', {
            attrs: {
                "slot": "header"
            },
            slot: "header"
        },
        [_v("header")]), _v(" "), _c('h3', [_v("ssssss")]), _v(" "), _c('p', {
            attrs: {
                "slot": "footer"
            },
            slot: "footer"
        },
        [_v("footer")])])], 1)
    }
})
```

