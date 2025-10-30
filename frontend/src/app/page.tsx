import Pepemaps from "@/components/page/Pepemaps";
import Collections from "@/components/page/Collections";
import PRCTwenty from "@/components/page/PRCTwenty";
import BiggestSalesOfDay from "@/components/page/BiggestSalesOfDay";

// import Console from "./console";

export default function Home() {
  return (
    <>
      {/* <Console /> */}
      <Pepemaps />
      <Collections />
      <PRCTwenty />
      <BiggestSalesOfDay />
    </>
  );
}
