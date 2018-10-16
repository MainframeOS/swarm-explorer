// @flow

import AppBar from '@material-ui/core/AppBar'
import Button from '@material-ui/core/Button'
import CssBaseline from '@material-ui/core/CssBaseline'
import Paper from '@material-ui/core/Paper'
import TextField from '@material-ui/core/TextField'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import { withStyles } from '@material-ui/core/styles'
import AddIcon from '@material-ui/icons/AddCircle'
import InfoIcon from '@material-ui/icons/Info'
import React, { Component, Fragment, createRef } from 'react'

import history, { getParams, setParams } from './history'
import {
  EMPTY_TREE,
  client,
  createTree,
  readFileBuffer,
  type VirtualDir,
} from './swarm'

import AboutDialog from './AboutDialog'
import CreateDirectoryDialog from './CreateDirectoryDialog'
import DirectoriesTable from './DirectoriesTable'
import FilesTable from './FilesTable'
import PathNavigation from './PathNavigation'

const styles = theme => ({
  actionButton: {
    margin: theme.spacing.unit,
  },
  appBarButton: {
    marginLeft: theme.spacing.unit,
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
  openDialog: ?('about' | 'create-directory'),
  path: string,
  tree: ?VirtualDir,
}

class App extends Component<Props, State> {
  inputRef = createRef()
  removeHistoryListener: () => void
  state = {
    invalidHash: false,
    localDirectories: {},
    localPaths: [],
    lookupHash: '',
    newDirectoryName: '',
    openDialog: undefined,
    path: '',
    tree: undefined,
  }

  componentDidMount() {
    this.removeHistoryListener = history.listen(this.handleLocation)
    this.handleLocation(history.location)
  }

  componentWillUnmount() {
    this.removeHistoryListener()
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
        const nextTree = await createTree(params.hash)
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
    const hash = await client.bzz.uploadDirectory(directoryData, {
      manifestHash: tree ? tree.hash : undefined,
      path: maybePath || path,
    })
    setParams({ hash })
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
    const hash = await client.bzz.uploadDirectory({})
    setParams({ hash })
  }

  onDeleteResource = async (path: string) => {
    const { tree } = this.state
    if (tree != null) {
      const hash = await client.bzz.deleteResource(tree.hash, path)
      setParams({ hash })
    }
  }

  onCloseDialog = () => {
    this.setState({ openDialog: undefined })
  }

  onOpenAbout = () => {
    this.setState({ openDialog: 'about' })
  }

  onOpenNewDirectory = () => {
    this.setState({ newDirectoryName: '', openDialog: 'create-directory' })
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
      this.onCloseDialog()
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
          openDialog: undefined,
        })
      } else {
        this.onCloseDialog()
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
      openDialog,
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
      let localSubDirs
      let subtree
      if (path == null || path === '') {
        subtree = tree
      } else if (tree.subpaths[path] != null) {
        subtree = tree.subpaths[path]
        localSubDirs = (localDirectories[path] || []).map(p => path + p)
      } else {
        subtree = EMPTY_TREE
      }

      contents = (
        <Fragment>
          <PathNavigation classes={classes} hash={tree.hash} path={path} />
          <DirectoriesTable
            key={subtree.hash || 'empty'}
            classes={classes}
            directories={subtree.directories.concat(
              localSubDirs || localDirectories[path] || [],
            )}
            onClickCreateDirectory={this.onOpenNewDirectory}
            tree={tree}
            uploadFiles={this.uploadFiles}
          />
          <FilesTable
            classes={classes}
            files={subtree.files}
            onClickUpload={this.onClickUpload}
            onDeleteResource={this.onDeleteResource}
            uploadFiles={this.uploadFiles}
          />
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
            <Button
              className={classes.appBarButton}
              color="inherit"
              onClick={this.onOpenAbout}
              variant="outlined">
              <InfoIcon className={classes.leftIcon} />
              About
            </Button>
          </Toolbar>
        </AppBar>
        {contents}
        <AboutDialog
          onClose={this.onCloseDialog}
          open={openDialog === 'about'}
        />
        <CreateDirectoryDialog
          name={newDirectoryName}
          onChangeName={this.onChangeDirectoryName}
          onClose={this.onCloseDialog}
          onCreate={this.onCreateNewDirectory}
          open={openDialog === 'create-directory'}
        />
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
