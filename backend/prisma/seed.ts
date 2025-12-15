import { PrismaClient, RoleName } from "@prisma/client";

const prisma = new PrismaClient();

const ROLE_DEFS: { roleName: RoleName; evil: boolean; displayName: string }[] = [
  { roleName: RoleName.MERLIN, evil: false, displayName: "Merlin" },
  { roleName: RoleName.PERCIVAL, evil: false, displayName: "Percival" },
  { roleName: RoleName.LOYAL_SERVANT, evil: false, displayName: "Loyal Servant of Arthur" },
  { roleName: RoleName.MORDRED, evil: true, displayName: "Mordred" },
  { roleName: RoleName.MORGANA, evil: true, displayName: "Morgana" },
  { roleName: RoleName.ASSASSIN, evil: true, displayName: "Assassin" },
  { roleName: RoleName.MINION, evil: true, displayName: "Minion of Mordred" },
  { roleName: RoleName.UNTRUSTWORTHY, evil: false, displayName: "Untrustworthy Servant" },
  { roleName: RoleName.TROUBLEMAKER, evil: false, displayName: "Troublemaker" },
  { roleName: RoleName.TRICKSTER, evil: true, displayName: "Trickster" },
  { roleName: RoleName.CLERIC, evil: false, displayName: "Cleric" },
  { roleName: RoleName.GOOD_SORCERER, evil: false, displayName: "Good Sorcerer" },
  { roleName: RoleName.EVIL_SORCERER, evil: true, displayName: "Evil Sorcerer" },
  { roleName: RoleName.SENIOR_MESSENGER, evil: false, displayName: "Senior Messenger" },
  { roleName: RoleName.JUNIOR_MESSENGER, evil: false, displayName: "Junior Messenger" },
  { roleName: RoleName.EVIL_MESSENGER, evil: true, displayName: "Evil Messenger" },
  { roleName: RoleName.GOOD_LANCELOT, evil: false, displayName: "Good Lancelot" },
  { roleName: RoleName.EVIL_LANCELOT, evil: true, displayName: "Evil Lancelot" },
  { roleName: RoleName.OBERON, evil: true, displayName: "Oberon" },
  { roleName: RoleName.LUNATIC, evil: true, displayName: "Lunatic" },
  { roleName: RoleName.BRUTE, evil: true, displayName: "Brute" },
  { roleName: RoleName.REVEALER, evil: true, displayName: "Revealer" },
  { roleName: RoleName.GOOD_ROGUE, evil: false, displayName: "Good Rogue" },
  { roleName: RoleName.EVIL_ROGUE, evil: true, displayName: "Evil Rogue" },
];

async function main() {
  for (const d of ROLE_DEFS) {
    await prisma.role.upsert({
      where: { roleName: d.roleName },
      update: { evil: d.evil, displayName: d.displayName },
      create: { roleName: d.roleName, evil: d.evil, displayName: d.displayName },
    });
  }
  console.log("Role seed complete");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
  });