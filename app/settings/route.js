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

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  const cookieStore = await cookies()
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
          // 400 days is the upper limit for Max-Age attribute (see https://developer.chrome.com/blog/cookie-max-age-expires)
          cookieStore.set({ name: paramName, value: paramValue, maxAge: 400 * 24 * 3600 })
        }
      }
      // Note that we do nothing on 'cancel' action (keep current cookies values)
    }
  }

  // Never use permanentRedirect, it's a pain to make Chrome forget it
  // (but there is a way thanks to https://www.neilwithdata.com/chrome-redirect-forget)
  // TODO: 'replace' value for type parameter doesn't seem to work (multiple entries are still kept in the history)
  // I tried POST method (using formData instead of nextUrl.searchParam,
  // and redirect of NextResponse instead of navigation) but this doesn't change anything.
  // So I removed the parameter and the default value then applies ('push' for a server action)
  // with no apparent change in behavior
  redirect('/')
}
