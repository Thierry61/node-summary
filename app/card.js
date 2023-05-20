export default async function Card({title, items}) {
  return (
    <div className="p-2 bg-blue-100 rounded-lg">
      <div className="font-bold">
        {title}:
      </div>
      <div className="flex justify-between">
        <div>
          {items.map((item, index) => (
            <div key={index} className="">
              {Object.keys(item)[0]}:
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <div>
            {items.map((item, index) => (
              <div key={index} className="text-end font-mono">
                {Object.values(item)[0].toString().split(' ')[0]}
              </div>
            ))}
          </div>
          <div>
            {items.map((item, index) => (
              <div key={index} className="font-mono w-14">
                {Object.values(item)[0].toString().split(' ')[1] ?? "\u00A0"}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
  