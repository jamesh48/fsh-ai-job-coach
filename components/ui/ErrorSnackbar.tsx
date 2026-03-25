'use client'

import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import Tooltip from '@mui/material/Tooltip'
import type { CustomContentProps } from 'notistack'
import { MaterialDesignContent } from 'notistack'
import { forwardRef, useState } from 'react'

const StyledContent = styled(MaterialDesignContent)(() => ({
  '& .notistack-MuiContent-action': {
    paddingRight: 4,
  },
}))

export const ErrorSnackbar = forwardRef<HTMLDivElement, CustomContentProps>(
  function ErrorSnackbar({ id, message, ...props }, ref) {
    const [copied, setCopied] = useState(false)

    function handleCopy() {
      navigator.clipboard.writeText(String(message))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <StyledContent
        ref={ref}
        id={String(id)}
        message={message}
        {...props}
        action={
          <Tooltip title={copied ? 'Copied!' : 'Copy error'}>
            <IconButton
              size='small'
              onClick={handleCopy}
              sx={{ color: 'inherit', opacity: 0.8, '&:hover': { opacity: 1 } }}
            >
              <ContentCopyIcon fontSize='inherit' />
            </IconButton>
          </Tooltip>
        }
      />
    )
  },
)
