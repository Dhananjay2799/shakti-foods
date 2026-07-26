export default function LoadingCustomers() {
  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-72 rounded bg-gray-200" />

          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map((i)=>(
              <div
                key={i}
                className="h-32 rounded-3xl bg-white shadow"
              />
            ))}
          </div>

          <div className="h-14 rounded-2xl bg-white shadow" />

          <div className="rounded-3xl bg-white shadow">
            {[1,2,3,4,5,6].map((i)=>(
              <div
                key={i}
                className="h-20 border-b"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}