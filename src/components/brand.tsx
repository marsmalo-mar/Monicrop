import Link from "next/link";
import Image from "next/image";
export function Brand() {
  return (
    <Link className="brand" href="/">
      <Image src="/logo.png" alt="" width={34} height={34} unoptimized />
      monicrop
    </Link>
  );
}
