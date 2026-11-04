import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'
import {
  carregarRascunhoFormulario,
  coletarCamposPersistiveis,
  limparRascunhoFormulario,
  obterContextoRascunho,
  restaurarCampos,
  salvarRascunhoFormulario,
} from '../lib/formDrafts'

export function FormDraftPersistence() {
  const { location } = useRouterState()
  const pathname = location.pathname

  useEffect(() => {
    let active = true
    let context: Awaited<ReturnType<typeof obterContextoRascunho>> | null = null
    const ids = new WeakMap<HTMLFormElement, string>()
    const timers = new WeakMap<HTMLFormElement, number>()
    const trackedForms = new Set<HTMLFormElement>()
    let nextId = 0

    const getId = (form: HTMLFormElement) => {
      trackedForms.add(form)
      let id = ids.get(form)
      if (!id) {
        id = form.id || form.getAttribute('aria-label') || `form-${++nextId}`
        ids.set(form, id)
      }
      return id
    }

    const restore = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active || !session?.user) return
      context = await obterContextoRascunho(session.user.id)
      if (!active) return
      for (const form of trackedForms) {
        const draft = await carregarRascunhoFormulario(context.usuarioId, context.perfilId, pathname, getId(form))
        if (active && draft) restaurarCampos(form, draft.campos)
      }
    }

    const saveForm = (form: HTMLFormElement) => {
      if (!context) return
      const oldTimer = timers.get(form)
      if (oldTimer) window.clearTimeout(oldTimer)
      const timer = window.setTimeout(() => {
        if (!context) return
        void salvarRascunhoFormulario({ ...context, rota: pathname, formulario: getId(form), campos: coletarCamposPersistiveis(form) })
      }, 80)
      timers.set(form, timer)
    }

    const handleInput = (event: Event) => {
      const target = event.target
      if (target instanceof HTMLElement) {
        const form = target.closest('form')
        if (form) saveForm(form)
      }
    }

    const handleSubmit = (event: Event) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement) || !context) return
      window.setTimeout(() => {
        if (!active || !context) return
        const fields = coletarCamposPersistiveis(form)
        if (!form.isConnected || Object.values(fields).every((value) => value === '' || value === false)) {
          void limparRascunhoFormulario(context.usuarioId, context.perfilId, pathname, getId(form))
        }
      }, 1_000)
    }

    const flushForms = () => {
      for (const form of trackedForms) {
        const timer = timers.get(form)
        if (timer) window.clearTimeout(timer)
        if (context) {
          void salvarRascunhoFormulario({ ...context, rota: pathname, formulario: getId(form), campos: coletarCamposPersistiveis(form) })
        }
      }
    }

    void restore()
    document.addEventListener('input', handleInput)
    document.addEventListener('change', handleInput)
    document.addEventListener('submit', handleSubmit, true)
    window.addEventListener('pagehide', flushForms)
    document.addEventListener('visibilitychange', flushForms)
    return () => {
      active = false
      document.removeEventListener('input', handleInput)
      document.removeEventListener('change', handleInput)
      document.removeEventListener('submit', handleSubmit, true)
      window.removeEventListener('pagehide', flushForms)
      document.removeEventListener('visibilitychange', flushForms)
      for (const form of trackedForms) saveForm(form)
    }
  }, [pathname])

  return null
}
