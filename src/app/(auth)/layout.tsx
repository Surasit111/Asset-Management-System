export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f9f9f9]"
        >
            <div className="w-full max-w-[500px]">
                {children}
            </div>
        </div>
    );
}
