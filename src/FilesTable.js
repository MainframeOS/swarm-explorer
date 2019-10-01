// @flow

import {
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@material-ui/core'
import UploadIcon from '@material-ui/icons/CloudUpload'
import DeleteIcon from '@material-ui/icons/Delete'
import DownloadIcon from '@material-ui/icons/CloudDownload'
import bytes from 'bytes'
import React, { Component } from 'react'

import { getDownloadURL, type VirtualFile } from './swarm'

type Props = {
  classes: Object,
  files: Array<VirtualFile>,
  onClickUpload: () => any,
  onDeleteResource: (path: string) => any,
  uploadFiles: (files: Array<File>) => any,
}

type State = {
  showDrop: boolean,
}

export default class FilesTable extends Component<Props, State> {
  state = {
    showDrop: false,
  }

  render() {
    const {
      classes,
      files,
      onClickUpload,
      onDeleteResource,
      uploadFiles,
    } = this.props

    const rows = files.map(file => {
      const name = file.path.split('/').slice(-1)[0]
      return (
        <TableRow key={file.hash}>
          <TableCell component="th" scope="row">
            {name}
          </TableCell>
          <TableCell>{file.hash}</TableCell>
          <TableCell>{file.contentType}</TableCell>
          <TableCell>{file.date.toUTCString()}</TableCell>
          <TableCell>{bytes(file.size)}</TableCell>
          <TableCell>
            <Tooltip title="Download">
              <IconButton
                className={classes.actionButton}
                component="a"
                download={name}
                href={getDownloadURL(file)}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                className={classes.actionButton}
                aria-label="Delete"
                onClick={e => {
                  e.preventDefault()
                  onDeleteResource(file.path)
                }}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </TableCell>
        </TableRow>
      )
    })

    return (
      <div>
        <Paper
          className={classes.paperContainer}
          elevation={this.state.showDrop ? 20 : 2}
          onDragEnter={e => {
            e.dataTransfer.dropEffect = 'move'
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)'
          }}
          onDragLeave={e => {
            e.currentTarget.style.backgroundColor = 'white'
          }}
          onDrop={e => {
            uploadFiles(Array.from(e.dataTransfer.files))
          }}>
          <Typography className={classes.paperTitle} variant="h4">
            Files
            <Button
              className={classes.titleButton}
              color="secondary"
              onClick={onClickUpload}
              size="medium"
              variant="outlined">
              <UploadIcon className={classes.leftIcon} />
              Upload files
            </Button>
          </Typography>
          {rows.length === 0 ? (
            <Typography className={classes.tableEmpty}>No file</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Hash</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Date modified</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>{rows}</TableBody>
            </Table>
          )}
        </Paper>
      </div>
    )
  }
}
