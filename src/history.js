// @flow

import createHistory from 'history/createBrowserHistory'
import qs from 'query-string'

const history = createHistory()

export const setParams = (params: Object = {}, replace: boolean = false) => {
  const current = replace ? {} : qs.parse(history.location.search)
  history.push({ search: qs.stringify({ ...current, ...params }) })
}

export const createOnClickPath = (path: string = '') => {
  return (e: SyntheticMouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setParams({ path })
  }
}

export const getParams = (location: Object = history.location): Object => {
  return qs.parse(location.search)
}

export default history
