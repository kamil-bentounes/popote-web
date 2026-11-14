import { describe, expect, it } from 'vitest'
import { sansInteraction } from './nonInteractif'

describe('sansInteraction', () => {
  it.each([
    'onClick', 'onClickCapture', 'onDoubleClick', 'onAuxClick', 'onContextMenu',
    'onKeyDown', 'onKeyDownCapture', 'onKeyUp', 'onKeyPress',
    'onPointerDown', 'onPointerDownCapture', 'onPointerUp', 'onPointerCancel',
    'onMouseDown', 'onMouseUp', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel',
    'onDrag', 'onDrop', 'onFocus', 'onFocusCapture',
    'role', 'tabIndex', 'contentEditable', 'draggable', 'accessKey', 'popover',
    'aria-pressed', 'aria-expanded', 'aria-haspopup', 'aria-checked', 'aria-selected',
  ])('retire %s', (nom) => {
    expect(sansInteraction({ [nom]: nom.startsWith('on') ? () => undefined : 'x', 'data-garde': 'oui' })).toEqual({ 'data-garde': 'oui' })
  })

  it('garde ce qui n’y touche pas : classe, id, texte, attributs data et aria de description', () => {
    const reste = { className: 'p-2', id: 'a', title: 'Bonjour', 'data-x': '1', 'aria-describedby': 'b', 'aria-hidden': true, onAnimationEnd: () => undefined }
    expect(sansInteraction(reste)).toEqual(reste)
  })
})
