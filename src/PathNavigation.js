// @flow

import Button from '@material-ui/core/Button'
import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import DownloadIcon from '@material-ui/icons/CloudDownload'
import React, { Component } from 'react'

import { createOnClickPath } from './history'
import { client } from './swarm'

const onClickRoot = createOnClickPath('')

type Props = {
  classes: Object,
  hash: string,
  path: ?string,
}

export default class PathNavigation extends Component<Props> {
  onClickDownload = async () => {
    const { hash } = this.props
    const res = await client.bzz.download(
      hash,
      { contentType: 'application/x-tar' },
      { accept: 'application/x-tar' },
    )
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.download = `${hash}.tar`
    a.href = url
    a.dispatchEvent(new MouseEvent('click'))
  }

  render() {
    const { classes, hash, path } = this.props

    const substeps = path
      ? path
          .split('/')
          .slice(0, -1)
          .reduce(
            (acc, part) => {
              const nextPath = `${acc.path}${part}/`
              const link = (
                <a
                  href="#contents"
                  key={nextPath}
                  onClick={createOnClickPath(nextPath)}>
                  {part}
                </a>
              )
              return {
                items: [...acc.items, ' / ', link],
                path: nextPath,
              }
            },
            {
              items: [],
              path: '',
            },
          )
      : null

    return (
      <Paper className={classes.paperContainer}>
        <Typography className={classes.paperTitle} variant="h4">
          Path
          {path == null || path === '' ? (
            <Button
              className={classes.titleButton}
              color="secondary"
              onClick={this.onClickDownload}
              size="small"
              variant="outlined">
              <DownloadIcon className={classes.leftIcon} />
              Download
            </Button>
          ) : null}
        </Typography>
        <Typography className={classes.paperContents} variant="h6">
          <a href="#contents" onClick={onClickRoot}>
            {hash}
          </a>
          {substeps ? substeps.items : null}
        </Typography>
      </Paper>
    )
  }
}
