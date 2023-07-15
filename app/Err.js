// Component to display errors from server
// Don't name the file error.js because this is a reserved file name for Next js

export default async function Err({err, date}) {
  return (
    <div className='text-xl px-2 py-1 bg-blue-100 rounded-lg'>
      <h1 className="font-bold">Something went wrong!</h1>
      <div className="flex gap-2">
        {/* justify-between to align "Date" to the bottom when error string is on several lines */}
        <div className="flex flex-col justify-between">
          <div className="">Error:</div>
          <div className="">Date:</div>
        </div>
        <div>
          <div className="px-1 bg-red-300">{JSON.stringify(err)}</div>
          <div className="px-1">{new Date(date).toUTCString()}</div>
        </div>
      </div>
    </div>
  )
}
