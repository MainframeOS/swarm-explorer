// @flow

import Button from '@material-ui/core/Button'
import Paper from '@material-ui/core/Paper'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import Typography from '@material-ui/core/Typography'
import CreateFolderIcon from '@material-ui/icons/CreateNewFolder'
import bytes from 'bytes'
import React, { Component } from 'react'

import { createOnClickPath } from './history'
import { EMPTY_TREE, type VirtualDir } from './swarm'

type Props = {
  classes: Object,
  directories: Array<string>,
  onClickCreateDirectory: () => void,
  tree: VirtualDir,
  uploadFiles: (files: Array<File>, path: string) => any,
}

type State = {
  selectedPath: ?string,
}

export default class DirectoriesTable extends Component<Props, State> {
  state = {
    selectedPath: undefined,
  }

  render() {
    const {
      classes,
      directories,
      onClickCreateDirectory,
      tree,
      uploadFiles,
    } = this.props

    const rows = directories.map(path => {
      const dir = tree.subpaths[path] || EMPTY_TREE
      const name = path.split('/').slice(-2, -1)[0]
      return (
        <TableRow
          key={path}
          onDragEnter={e => {
            e.dataTransfer.dropEffect = 'move'
            this.setState({ selectedPath: path })
          }}
          onDragLeave={e => {
            this.setState(({ selectedPath }) => {
              return selectedPath === path ? { selectedPath: undefined } : null
            })
          }}
          onDrop={e => {
            uploadFiles(Array.from(e.dataTransfer.files), path)
          }}
          selected={this.state.selectedPath === path}>
          <TableCell component="th" scope="row">
            <a href="#contents" onClick={createOnClickPath(path)}>
              {name}
            </a>
          </TableCell>
          <TableCell>{dir.filesCount}</TableCell>
          <TableCell>{dir.date ? dir.date.toUTCString() : null}</TableCell>
          <TableCell>{bytes(dir.size)}</TableCell>
        </TableRow>
      )
    })

    return (
      <Paper className={classes.paperContainer}>
        <Typography className={classes.paperTitle} variant="h4">
          Directories
          <Button
            className={classes.titleButton}
            color="secondary"
            onClick={onClickCreateDirectory}
            size="medium"
            variant="outlined">
            <CreateFolderIcon className={classes.leftIcon} />
            New directory
          </Button>
        </Typography>
        {rows.length === 0 ? (
          <Typography className={classes.tableEmpty}>No directory</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Path</TableCell>
                <TableCell>Files count</TableCell>
                <TableCell>Date modified</TableCell>
                <TableCell>Size</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{rows}</TableBody>
          </Table>
        )}
      </Paper>
    )
  }
}
