// @flow

import { SwarmClient } from '@erebos/swarm-browser'

export const EMPTY_TREE = {
  directories: [],
  files: [],
  filesCount: 0,
  size: 0,
}

const bzzURL = window.location.href.includes('bzz:/')
  ? `${window.location.protocol}//${window.location.host}`
  : 'http://localhost:8500'

export const client = new SwarmClient({ bzz: bzzURL })

export type VirtualFile = {
  contentType: string,
  date: Date,
  hash: string,
  path: string,
  size: number,
}

export type VirtualDir = {
  date: Date,
  directories: Array<string>,
  files: Array<VirtualFile>,
  filesCount: number,
  hash: string,
  path: string,
  size: number,
  subpaths: { [path: string]: VirtualDir },
}

export const createTree = async (
  hash: string,
  path: string = '',
): Promise<VirtualDir> => {
  const list = await client.bzz.list(hash, { path })

  let date = new Date()
  let filesCount = 0
  let size = 0

  let subpaths = {}
  let directories = []
  if (list.common_prefixes != null) {
    directories = list.common_prefixes
    const directoriesData = await Promise.all(
      list.common_prefixes.map(dirPath => createTree(hash, dirPath)),
    )
    subpaths = directoriesData.reduce((acc, dir) => {
      if (dir.date < date) date = dir.date
      filesCount += dir.filesCount
      size += dir.size
      acc[dir.path] = dir
      return { ...acc, ...dir.subpaths }
    }, {})
  }

  let files = []
  if (list.entries != null) {
    files = list.entries.map(entry => {
      const fileDate = new Date(entry.mod_time)
      const fileSize = entry.size || 0
      if (fileDate < date) date = fileDate
      size += fileSize
      return {
        path: entry.path,
        hash: entry.hash,
        contentType: entry.contentType,
        date: fileDate,
        size: fileSize,
      }
    })
  }
  filesCount += files.length

  return { date, directories, files, filesCount, hash, path, size, subpaths }
}

export const getDownloadURL = (file: VirtualFile): string => {
  return client.bzz.getDownloadURL(file.hash, {
    contentType: file.contentType,
    mode: 'raw',
  })
}

export const readFileBuffer = (file: File): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('error', reject)
    reader.addEventListener('loadend', () => {
      resolve(Buffer.from(reader.result))
    })
    reader.readAsArrayBuffer(file)
  })
}
