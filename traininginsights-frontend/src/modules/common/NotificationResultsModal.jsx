import React from 'react'
import { Dialog, DialogTitle, DialogContent, Table, TableHead, TableRow, TableCell, TableBody, DialogActions, Button } from '@mui/material'

export default function NotificationResultsModal({ open, onClose, results }){
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Send results</DialogTitle>
      <DialogContent>
        <Table>
          <TableHead>
            <TableRow><TableCell>Recipient</TableCell><TableCell>Email</TableCell><TableCell>Target</TableCell><TableCell>Dispatched</TableCell><TableCell>Error</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {(results || []).map((r, idx) => (
              <TableRow key={idx}>
                <TableCell>{r.recipientId || '—'}</TableCell>
                <TableCell>{r.email || '—'}</TableCell>
                <TableCell>{r.targetType || ''} {r.targetId || ''}</TableCell>
                <TableCell>{r.dispatched ? 'Yes' : 'No'}</TableCell>
                <TableCell style={{ color: 'red' }}>{r.error || ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
