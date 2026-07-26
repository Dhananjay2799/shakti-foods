export default function LoadingCustomerProfile() {
  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
        <div className="animate-pulse">
          <div className="h-12 w-48 rounded-full bg-white" />

          <div className="mt-8 h-48 rounded-[2rem] bg-white" />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-36 rounded-[1.75rem] bg-white"
              />
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="grid gap-6">
              <div className="h-96 rounded-[2rem] bg-white" />
              <div className="h-72 rounded-[2rem] bg-white" />
            </div>

            <div className="h-[650px] rounded-[2rem] bg-white" />
          </div>
        </div>
      </div>
    </main>
  );
}