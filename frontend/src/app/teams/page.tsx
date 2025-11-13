import Image from "next/image";
import { Linkedin, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";

const team = [
  {
    name: "Lucky-Degendev",
    role: "Project Manager",
    image: "/assets/Logo.png",
    telegram: "https://t.me/alicepm",
    linkedin: "https://linkedin.com/in/alicenguyen",
    summary: `Leading the Pepecoin Chain market platform with strategic planning and cross-team coordination. Oversees roadmap execution, aligning engineering, design, and marketing teams to accelerate adoption. Ensures balance between community engagement, technical delivery, and sustainable platform growth.`,
  },
  {
    name: "₿yte-Assembler",
    role: "Web3 Engineer",
    image: "/assets/Logo.png",
    telegram: "https://t.me/marcusdev",
    linkedin: "https://linkedin.com/in/marcuslee",
    summary: `Building core smart-contract components powering the Pepecoin Chain marketplace. Focused on secure token flows, liquidity logic, and decentralized market protocols. Dedicated to shaping the future of memecoin-driven blockchain culture with reliability and innovation.`,
  },
  {
    name: "Auro-Grava",
    role: "Blockchain Developer",
    image: "/assets/Logo.png",
    telegram: "https://t.me/sofiapatel",
    linkedin: "https://linkedin.com/in/sofiapatel",
    summary: `Developing decentralized infrastructure and blockchain logic for the Pepecoin ecosystem. Optimizing transaction efficiency, token mechanics, and protocol security for memecoin adoption. Ensures robust, scalable solutions to support long-term growth and seamless user experiences.`,
  },
];

export default function TeamPage() {
  return (
    <div className="flex min-h-screen flex-col items-center">
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
        {team.map((member) => (
          <Card
            key={member.name}
            className="relative flex flex-row gap-4 overflow-hidden rounded-[12px] bg-[#4c505c33] p-8 text-center shadow-md outline-1 outline-transparent transition-all duration-200 ease-in-out hover:border-[#8c45ff] hover:shadow-lg lg:flex-col lg:gap-0 hover:[&_h2]:text-[#8c45ff]"
          >
            <div className="lg:block flex lg:w-auto">
              <div className="relative mx-auto mb-4 h-40 w-40 overflow-hidden rounded-full">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="w-30 py-4 lg:w-auto">
                <h2 className="text-xl font-semibold">@{member.name}</h2>
                <p className="mb-4 text-gray-400">{member.role}</p>

                {/* Social Links */}
                <div className="mb-4 flex justify-center gap-4">
                  <Link
                    href={member.telegram}
                    target="_blank"
                    className="transition hover:opacity-70"
                  >
                    <Send size={20} />
                  </Link>
                  <Link
                    href={member.linkedin}
                    target="_blank"
                    className="transition hover:opacity-70"
                  >
                    <Linkedin size={20} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Responsive Summary Layout */}
            <div className="w-full text-left text-sm">
              {/* Small width: summary right */}
              <div className="flex flex-row items-start gap-4 lg:hidden">
                <div className="flex-1">{member.summary}</div>
              </div>
              {/* Large width: summary bottom */}
              <div className="mt-4 hidden lg:block">{member.summary}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
