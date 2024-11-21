/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { TriggerOpTypes } from '../../v3'
import { def } from '../util/index'

const arrayProto = Array.prototype
// 以数据原型创建一个对象，这个对象拥有数据原型上的方法和数据
export const arrayMethods = Object.create(arrayProto)

// 需要修正的方法(会改原数据，数据会发生变换) 增/删/排序/反转
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  // 拦截数组中的操作方法，触发改变事件
  // 定义对象本身的方法，属于arrayMethods是自己一套，原型上还有一套
  def(arrayMethods, method, function mutator(...args) {
    const result = original.apply(this, args)
    // 可以拿到观察者对象
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // 是对新增数组项进行监测
    if (inserted) ob.observeArray(inserted)
    // notify change
    if (__DEV__) {
      // 这里的dep和依赖收集中的dep是同一个，所以数组是通过Observer实例中的dep保存依赖的
      ob.dep.notify({
        type: TriggerOpTypes.ARRAY_MUTATION,
        target: this,
        key: method
      })
    } else {
      // 这边的dep只初始化过，没有注册Watcher应该，为什么能起作用？
      ob.dep.notify()
    }
    return result
  })
})
