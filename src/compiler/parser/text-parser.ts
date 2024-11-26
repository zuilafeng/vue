import { cached } from 'shared/util'
import { parseFilters } from './filter-parser'

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g
const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g

const buildRegex = cached(delimiters => {
  const open = delimiters[0].replace(regexEscapeRE, '\\$&')
  const close = delimiters[1].replace(regexEscapeRE, '\\$&')
  return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
})

type TextParseResult = {
  expression: string
  tokens: Array<string | { '@binding': string }>
}

export function parseText(
  text: string,
  delimiters?: [string, string]
): TextParseResult | void {
  //@ts-expect-error
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE
  // 用tagRE去匹配传入的文本内容，判断是否包含变量，若不包含，则直接返回
  if (!tagRE.test(text)) {
    return
  }
  const tokens: string[] = []
  const rawTokens: any[] = []
  let lastIndex = (tagRE.lastIndex = 0)
  let match, index, tokenValue
  // 判断是否包含表达式或变量
  while ((match = tagRE.exec(text))) {
    index = match.index
    // push text token
    // 表示变量前面有纯文本，那么就把这段纯文本截取出来，存入rawTokens
    if (index > lastIndex) {
      // 先把'{{'前面的文本放入tokens中
      rawTokens.push((tokenValue = text.slice(lastIndex, index)))
      tokens.push(JSON.stringify(tokenValue))
    }
    // tag token
    // 取出'{{ }}'中间的变量exp
    const exp = parseFilters(match[1].trim())
    // 把变量exp改成_s(exp)形式也放入tokens中
    tokens.push(`_s(${exp})`)
    rawTokens.push({ '@binding': exp })
    // 设置lastIndex 以保证下一轮循环时，只从'}}'后面再开始匹配正则
    lastIndex = index + match[0].length
  }
  // 当剩下的text不再被正则匹配上时，表示所有变量已经处理完毕
  // 此时如果lastIndex < text.length，表示在最后一个变量后面还有文本
  // 最后将后面的文本再加入到tokens中
  if (lastIndex < text.length) {
    rawTokens.push((tokenValue = text.slice(lastIndex)))
    tokens.push(JSON.stringify(tokenValue))
  }
  // 最后把数组tokens中的所有元素用'+'拼接起来
  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}
