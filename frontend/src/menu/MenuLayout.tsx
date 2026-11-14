import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import pkg from '../../package.json'
import { useServerWake } from '../api/useServerWake'
import { useSettings } from '../settings/context'
import { Starfield } from './Starfield'
import './menu.css'

/** Shared frame of all menu screens: the turning sky stays mounted between them. */
export function MenuLayout() {
  const { t } = useTranslation()
  const { settings } = useSettings()
  const server = useServerWake()

  return (
    <div className="mm-root">
      <Starfield moving={settings.skyMotion} />
      <div className="mm-content">
        <Outlet />
      </div>
      <footer className="mm-footer">
        <span className="mm-nowrap">
          v{pkg.version}
          <span className="mm-footer-event"> · NASA Space Apps 2026</span>
        </span>
        <span className="mm-server mm-nowrap" role="status" title={t(`server.${server}`)}>
          <i className={`mm-dot mm-dot-${server}`} aria-hidden="true" />
          {t(`server.short.${server}`)}
        </span>
      </footer>
    </div>
  )
}
