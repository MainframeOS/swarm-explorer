// @flow

import { MuiThemeProvider, createMuiTheme } from '@material-ui/core'
import React from 'react'
import ReactDOM from 'react-dom'
import 'typeface-roboto'

import App from './App'
import './index.css'

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#ff8c00',
    },
    secondary: {
      main: '#337ab7',
    },
    error: {
      main: '#d72323',
    },
  },
  typography: {
    useNextVariants: true,
  },
})

const preventDefault = (event: DragEvent) => {
  event.preventDefault()
}

document.addEventListener('dragover', preventDefault)
document.addEventListener('drop', preventDefault)

const root = document.getElementById('root')
if (root != null) {
  ReactDOM.render(
    <MuiThemeProvider theme={theme}>
      <App />
    </MuiThemeProvider>,
    root,
  )
}
