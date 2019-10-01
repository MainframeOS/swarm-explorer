// @flow

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@material-ui/core'
import React from 'react'

type Props = {
  onClose: () => any,
  open: boolean,
}

const AboutDialog = ({ onClose, open }: Props) => (
  <Dialog open={open} onClose={onClose} aria-labelledby="form-dialog-title">
    <DialogTitle id="form-dialog-title">About</DialogTitle>
    <DialogContent>
      <Typography>
        <a href="https://github.com/MainframeHQ/swarm-explorer">
          Swarm Explorer
        </a>{' '}
        is developed by <a href="https://mainframe.com">Mainframe</a> using the{' '}
        <a href="https://erebos.js.org">Erebos library</a>.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="secondary">
        Close
      </Button>
    </DialogActions>
  </Dialog>
)

export default AboutDialog
