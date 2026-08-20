declare module 'diff' {
  export function createTwoFilesPatch(
    oldFileName: string,
    newFileName: string,
    oldStr: string,
    newStr: string,
    oldHeader?: string,
    newHeader?: string,
    options?: any
  ): string

  export function diffLines(
    oldStr: string,
    newStr: string,
    options?: any
  ): Array<{
    count?: number
    value: string
    added?: boolean
    removed?: boolean
  }>
}