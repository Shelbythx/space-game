import { Outlet, useParams } from 'react-router-dom'
import { RoomContext, useRoom } from './useRoom'

/** Route `#/coop/:code`: one polled room shared by the lobby and the five mission stages. */
export function CoopRoom() {
  const { code = '' } = useParams()
  const handle = useRoom(code.toUpperCase())
  return (
    <RoomContext.Provider value={handle}>
      <Outlet />
    </RoomContext.Provider>
  )
}
