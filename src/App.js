// @flow

import { SwarmClient } from '@erebos/swarm-browser'
import AppBar from '@material-ui/core/AppBar'
import Button from '@material-ui/core/Button'
import CssBaseline from '@material-ui/core/CssBaseline'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import IconButton from '@material-ui/core/IconButton'
import Paper from '@material-ui/core/Paper'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import TextField from '@material-ui/core/TextField'
import Toolbar from '@material-ui/core/Toolbar'
import Tooltip from '@material-ui/core/Tooltip'
import Typography from '@material-ui/core/Typography'
import { withStyles } from '@material-ui/core/styles'
import AddIcon from '@material-ui/icons/Add'
import UploadIcon from '@material-ui/icons/CloudUpload'
import CreateFolderIcon from '@material-ui/icons/CreateNewFolder'
import DeleteIcon from '@material-ui/icons/Delete'
import DownloadIcon from '@material-ui/icons/CloudDownload'
import bytes from 'bytes'
import React, { Component, Fragment, createRef } from 'react'

import history, { createOnClickPath, getParams, setParams } from './history'

const EMPTY_TREE = {
  directories: [],
  files: [],
  filesCount: 0,
  size: 0,
}

type VirtualFile = {
  contentType: string,
  date: Date,
  hash: string,
  path: string,
  size: number,
}

type VirtualDir = {
  date: Date,
  directories: Array<string>,
  files: Array<VirtualFile>,
  filesCount: number,
  hash: string,
  path: string,
  size: number,
  subpaths: { [path: string]: VirtualDir },
}

const createTree = async (
  client: SwarmClient,
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
      list.common_prefixes.map(dirPath => createTree(client, hash, dirPath)),
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

const readFileBuffer = (file: File): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('error', reject)
    reader.addEventListener('loadend', () => {
      resolve(Buffer.from(reader.result))
    })
    reader.readAsArrayBuffer(file)
  })
}

const styles = theme => ({
  actionButton: {
    margin: theme.spacing.unit,
  },
  leftIcon: {
    marginRight: theme.spacing.unit,
  },
  lookupForm: {
    flexGrow: 1,
    paddingLeft: theme.spacing.unit * 2,
    paddingRight: theme.spacing.unit * 2,
  },
  paperContainer: {
    margin: theme.spacing.unit * 2,
  },
  paperContents: {
    padding: theme.spacing.unit,
  },
  paperTitle: {
    paddingLeft: theme.spacing.unit,
    paddingTop: theme.spacing.unit,
  },
  tableEmpty: {
    padding: theme.spacing.unit * 2,
  },
  titleButton: {
    float: 'right',
    marginRight: theme.spacing.unit,
  },
})

type DirectoriesTableProps = {
  classes: Object,
  directories: Array<string>,
  onClickCreateDirectory: () => void,
  tree: VirtualDir,
  uploadFiles: (files: Array<File>, path: string) => any,
}

type DirectoriesTableState = {
  selectedPath: ?string,
}

class DirectoriesTable extends Component<
  DirectoriesTableProps,
  DirectoriesTableState,
> {
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

type FilesTableProps = {
  classes: Object,
  files: Array<VirtualFile>,
  getDownloadURL: (file: VirtualFile) => string,
  onClickUpload: () => any,
  onDeleteResource: (path: string) => any,
  uploadFiles: (files: Array<File>) => any,
}

type FilesTableState = {
  showDrop: boolean,
}

class FilesTable extends Component<FilesTableProps, FilesTableState> {
  state = {
    showDrop: false,
  }

  render() {
    const {
      classes,
      files,
      getDownloadURL,
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

type Props = {
  classes: Object,
}

type State = {
  invalidHash: boolean,
  localDirectories: {
    [path: string]: Array<string>,
  },
  localPaths: Array<string>,
  lookupHash: string,
  newDirectoryName: string,
  newDirectoryOpen: boolean,
  path: string,
  tree: ?VirtualDir,
}

class App extends Component<Props, State> {
  client: SwarmClient
  inputRef = createRef()
  removeHistoryListener: () => void
  state = {
    invalidHash: false,
    localDirectories: {},
    localPaths: [],
    lookupHash: '',
    newDirectoryName: '',
    newDirectoryOpen: false,
    path: '',
    tree: undefined,
  }

  componentDidMount() {
    const bzzURL = window.location.href.includes('bzz:/')
      ? `${window.location.protocol}//${window.location.host}`
      : 'http://localhost:8500'
    this.client = new SwarmClient(bzzURL)
    this.removeHistoryListener = history.listen(this.handleLocation)
    this.handleLocation(history.location)
  }

  componentWillUnmount() {
    this.removeHistoryListener()
  }

  getDownloadURL = (file: VirtualFile): string => {
    return this.client.bzz.getDownloadURL(file.hash, {
      contentType: file.contentType,
      mode: 'raw',
    })
  }

  isValidPath(nextPath: string): boolean {
    const { localPaths, tree } = this.state
    if (tree == null) {
      return false
    }
    if (tree.subpaths[nextPath] != null) {
      return true
    }
    return localPaths.includes(nextPath)
  }

  handleLocation = async (location: Object) => {
    const { localDirectories, localPaths, path, tree } = this.state
    const params = getParams(location)
    if (params.hash != null && (tree == null || tree.hash !== params.hash)) {
      try {
        const nextTree = await createTree(this.client, params.hash)
        let nextPath = params.path || path
        if (nextPath == null || !this.isValidPath(nextPath)) {
          nextPath = ''
        }
        const nextState: $Shape<State> = {
          invalidHash: false,
          path: nextPath,
          tree: nextTree,
        }

        const localPathIndex = localPaths.indexOf(path)
        if (localPathIndex !== -1) {
          const parts = path.split('/').slice(0, -1)
          const parent =
            parts.length === 1 ? '' : parts.slice(0, -1).join('') + '/'
          const nextLocalPaths = [...localPaths]
          nextLocalPaths.splice(localPathIndex, 1)
          nextState.localPaths = nextLocalPaths

          if (localDirectories[parent] != null) {
            const name = parts[parts.length - 1] + '/'
            const localPathIndex = localDirectories[parent].indexOf(name)
            if (localPathIndex !== -1) {
              const nextDir = [...localDirectories[parent]]
              nextDir.splice(localPathIndex, 1)
              nextState.localDirectories = {
                ...localDirectories,
                [parent]: nextDir,
              }
            }
          }
        }

        this.setState(nextState)
      } catch (err) {
        this.setState({ invalidHash: true, tree: null })
      }
    } else if (params.path == null || params.path.length === 0) {
      this.setState({ path: '' })
    } else if (params.path !== path && this.isValidPath(params.path)) {
      this.setState({ path: params.path })
    }
  }

  uploadFiles = async (files: Array<File>, maybePath?: string) => {
    const filesData = await Promise.all(files.map(readFileBuffer))
    const directoryData = files.reduce((acc, file, index) => {
      acc[file.name] = { contentType: file.type, data: filesData[index] }
      return acc
    }, {})

    const { path, tree } = this.state
    const hash = await this.client.bzz.uploadDirectory(directoryData, {
      manifestHash: tree ? tree.hash : undefined,
      path: maybePath || path,
    })
    setParams({ hash })
  }

  onClickRoot = createOnClickPath('')

  onClickDownload = async () => {
    const { tree } = this.state
    if (tree == null) {
      return
    }

    const res = await this.client.bzz.download(
      tree.hash,
      { contentType: 'application/x-tar' },
      { accept: 'application/x-tar' },
    )
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.download = `${tree.hash}.tar`
    a.href = url
    a.dispatchEvent(new MouseEvent('click'))
  }

  onClickUpload = () => {
    if (this.inputRef.current != null) {
      this.inputRef.current.click()
    }
  }

  onUploadInputChange = () => {
    if (this.inputRef.current != null) {
      this.uploadFiles(Array.from(this.inputRef.current.files))
    }
  }

  onClickNewBucket = async () => {
    const hash = await this.client.bzz.uploadDirectory({})
    setParams({ hash })
  }

  onDeleteResource = async (path: string) => {
    const { tree } = this.state
    if (tree != null) {
      const hash = await this.client.bzz.deleteResource(tree.hash, path)
      setParams({ hash })
    }
  }

  onCloseNewDirectory = () => {
    this.setState({ newDirectoryOpen: false })
  }

  onOpenNewDirectory = () => {
    this.setState({ newDirectoryOpen: true, newDirectoryName: '' })
  }

  onChangeDirectoryName = (e: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({ newDirectoryName: e.target.value })
  }

  onCreateNewDirectory = () => {
    const {
      localDirectories,
      localPaths,
      newDirectoryName,
      path,
      tree,
    } = this.state

    if (tree == null) {
      this.onCloseNewDirectory()
    } else {
      const name = newDirectoryName.endsWith('/')
        ? newDirectoryName
        : `${newDirectoryName}/`
      const dirPath = path + name
      if (!localPaths.includes(dirPath)) {
        const localDirectoriesNames = localDirectories[path] || []
        this.setState({
          localDirectories: {
            ...localDirectories,
            [path]: [...localDirectoriesNames, name],
          },
          localPaths: [...localPaths, dirPath],
          newDirectoryName: '',
          newDirectoryOpen: false,
        })
      } else {
        this.onCloseNewDirectory()
      }
    }
  }

  onChangeLookup = (e: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({ lookupHash: e.target.value })
  }

  onSubmitLookup = (e: SyntheticInputEvent<HTMLFormElement>) => {
    e.preventDefault()
    const { lookupHash } = this.state
    if (lookupHash != null) {
      this.setState({ lookupHash: '' }, () => {
        setParams({ hash: lookupHash })
      })
    }
  }

  render() {
    const { classes } = this.props
    const {
      invalidHash,
      localDirectories,
      lookupHash,
      newDirectoryName,
      newDirectoryOpen,
      path,
      tree,
    } = this.state

    let contents = null
    if (tree == null) {
      if (invalidHash) {
        contents = (
          <Paper className={classes.paperContainer}>
            <Typography className={classes.paperContents} variant="h4">
              Invalid hash or manifest not found
            </Typography>
          </Paper>
        )
      } else {
        contents = (
          <Paper className={classes.paperContainer}>
            <Typography className={classes.paperContents} variant="h5">
              Lookup an existing hash or create a bucket to get started
            </Typography>
          </Paper>
        )
      }
    } else {
      let subtree
      if (path == null || path === '') {
        subtree = tree
      } else if (tree.subpaths[path] != null) {
        subtree = tree.subpaths[path]
      } else {
        subtree = EMPTY_TREE
      }

      const tables = (
        <Fragment>
          <DirectoriesTable
            key={subtree.hash || 'empty'}
            classes={classes}
            directories={subtree.directories.concat(
              localDirectories[path] || [],
            )}
            onClickCreateDirectory={this.onOpenNewDirectory}
            tree={tree}
            uploadFiles={this.uploadFiles}
          />
          <FilesTable
            classes={classes}
            files={subtree.files}
            getDownloadURL={this.getDownloadURL}
            onClickUpload={this.onClickUpload}
            onDeleteResource={this.onDeleteResource}
            uploadFiles={this.uploadFiles}
          />
        </Fragment>
      )

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

      const steps = (
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
            <a href="#contents" onClick={this.onClickRoot}>
              {tree.hash}
            </a>
            {substeps ? substeps.items : null}
          </Typography>
        </Paper>
      )

      contents = (
        <Fragment>
          {steps}
          {tables}
        </Fragment>
      )
    }

    return (
      <Fragment>
        <CssBaseline />
        <AppBar position="static">
          <Toolbar>
            <Typography color="inherit" variant="h6">
              Swarm Explorer
            </Typography>
            <form className={classes.lookupForm} onSubmit={this.onSubmitLookup}>
              <TextField
                fullWidth
                margin="dense"
                onChange={this.onChangeLookup}
                placeholder="Look up manifest hash or ENS address"
                value={lookupHash}
              />
            </form>
            <Button
              color="inherit"
              onClick={this.onClickNewBucket}
              variant="outlined">
              <AddIcon className={classes.leftIcon} />
              New bucket
            </Button>
          </Toolbar>
        </AppBar>
        {contents}
        <Dialog
          open={newDirectoryOpen}
          onClose={this.onCloseNewDirectory}
          aria-labelledby="form-dialog-title">
          <DialogTitle id="form-dialog-title">
            Create a new directory
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="New directory name"
              onChange={this.onChangeDirectoryName}
              value={newDirectoryName}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.onCloseNewDirectory} color="secondary">
              Cancel
            </Button>
            <Button
              onClick={this.onCreateNewDirectory}
              color="primary"
              variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>
        <input
          multiple
          onChange={this.onUploadInputChange}
          ref={this.inputRef}
          style={{ display: 'none' }}
          type="file"
        />
      </Fragment>
    )
  }
}

export default withStyles(styles)(App)
