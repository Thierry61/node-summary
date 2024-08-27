// Manage settings form:
// - Possible 'action' param values (in input):
//   - 'open' to open the form
//   - 'save' to set the cookies depending on form params ('theme' and 'refresh')
//   - 'reset' to delete all cookies
//   - 'cancel' to keep current cookies (in other words: to do nothing)
// - Possible 'action' cookie values (in output):
//   - 'open' to open the form
//   - undefined to close the form
import { cookies } from 'next/headers'
import { redirect } from "next/navigation"

const settings = ['refresh', 'theme']

export function GET(request) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  const cookieStore = cookies()
  if (action) {
    if (action == 'open') {
      if (cookieStore.get('action')?.value == 'open') {
        // If form is already opened just close it
        // This implements a 'cancel' behavior. I am not sure this is the right choice,
        // but anyway we don't have have access to form data here.
        cookieStore.delete('action')
      } else {
        // If form is closed then open it
        cookieStore.set('action', 'open')
      }
    } else {
      // Delete 'action' cookie to close the form
      cookieStore.delete('action')
      if (action == 'reset') {
        // Delete all cookies
        for (const paramName of settings) {
          cookieStore.delete(paramName)
        }
      } else if (action == 'save') {
        // Set cookies according to form data
        for (const paramName of settings) {
          const paramValue = searchParams.get(paramName)
          cookieStore.set(paramName, paramValue)
        }
      }
      // Note that we do nothing on 'cancel' action (keep current cookies values)
    }
  }

  // Never use permanentRedirect, it's a pain to make Chrome forget it
  // (but there is a way thanks to https://www.neilwithdata.com/chrome-redirect-forget)
  // TODO: 'replace' parameter doesn't seem to work (multiple entries are kept in the history)
  redirect('/', 'replace')
}
