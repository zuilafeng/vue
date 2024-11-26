import { _Set as Set, isObject, isArray } from '../util/index'
import type { SimpleSet } from '../util/index'
import VNode from '../vdom/vnode'
import { isRef } from '../../v3'

const seenObjects = new Set()

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
export function traverse(val: any) {
  _traverse(val, seenObjects)
  seenObjects.clear()
  return val
}

function _traverse(val: any, seen: SimpleSet) {
  let i, keys
  const isA = isArray(val)
  // 如果不是数组且不是对象，那应该没有必要递归下层数据了
  // 如果是已冻结，数据不可变化，也没有必要再遍历
  if (
    (!isA && !isObject(val)) ||
    val.__v_skip /* ReactiveFlags.SKIP */ ||
    Object.isFrozen(val) ||
    val instanceof VNode
  ) {
    return
  }
  // 判断当前的值是不是已经是响应式对象
  // 取出其中依赖的id，如果是已经在set中记录过，则不进行增加，否则增加
  // 为了避免重复触发依赖收集
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  // 数组遍历
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else if (isRef(val)) {
    _traverse(val.value, seen)
  } else {
    // 对象遍历
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}
