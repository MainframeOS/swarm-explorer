// @flow

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@material-ui/core'
import React from 'react'

type Props = {
  name: string,
  onChangeName: (event: SyntheticInputEvent<HTMLInputElement>) => any,
  onClose: () => any,
  onCreate: () => any,
  open: boolean,
}

const CreateDirectoryDialog = ({
  name,
  onChangeName,
  onClose,
  onCreate,
  open,
}: Props) => (
  <Dialog open={open} onClose={onClose} aria-labelledby="form-dialog-title">
    <DialogTitle id="form-dialog-title">Create a new directory</DialogTitle>
    <DialogContent>
      <TextField
        autoFocus
        margin="dense"
        id="name"
        label="New directory name"
        onChange={onChangeName}
        value={name}
        fullWidth
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="secondary">
        Cancel
      </Button>
      <Button onClick={onCreate} color="primary" variant="contained">
        Create
      </Button>
    </DialogActions>
  </Dialog>
)

export default CreateDirectoryDialog
