import { PrismaClient, RoleName } from "@prisma/client";

const prisma = new PrismaClient();

// Insert into table in order of importance for the sake of getting common roles first when sorting by id :)
// Is there a better way to do this...? Yes. Do I care enough to implement it...? No.
// I just don't wanna change the schema again lol

const ROLE_DEFS: { roleName: RoleName; evil: boolean; displayName: string }[] = [
  // Standard roles
  { roleName: RoleName.MERLIN, evil: false, displayName: "Merlin" },
  { roleName: RoleName.PERCIVAL, evil: false, displayName: "Percival" },
  { roleName: RoleName.MORDRED, evil: true, displayName: "Mordred" },
  { roleName: RoleName.MORGANA, evil: true, displayName: "Morgana" },

  // Some of our most common additional roles
  { roleName: RoleName.UNTRUSTWORTHY, evil: false, displayName: "Untrustworthy Servant" },
  { roleName: RoleName.SENIOR_MESSENGER, evil: false, displayName: "Senior Messenger" },
  { roleName: RoleName.JUNIOR_MESSENGER, evil: false, displayName: "Junior Messenger" },
  { roleName: RoleName.EVIL_MESSENGER, evil: true, displayName: "Evil Messenger" },
  { roleName: RoleName.GOOD_SORCERER, evil: false, displayName: "Good Sorcerer" },
  { roleName: RoleName.EVIL_SORCERER, evil: true, displayName: "Evil Sorcerer" },

  // These see little play
  { roleName: RoleName.TROUBLEMAKER, evil: false, displayName: "Troublemaker" },
  { roleName: RoleName.TRICKSTER, evil: true, displayName: "Trickster" },
  { roleName: RoleName.CLERIC, evil: false, displayName: "Cleric" },

  // Hardly ever
  { roleName: RoleName.GOOD_LANCELOT, evil: false, displayName: "Good Lancelot" },
  { roleName: RoleName.EVIL_LANCELOT, evil: true, displayName: "Evil Lancelot" },
  { roleName: RoleName.OBERON, evil: true, displayName: "Oberon" },

  // Literally never as of yet
  { roleName: RoleName.LUNATIC, evil: true, displayName: "Lunatic" },
  { roleName: RoleName.BRUTE, evil: true, displayName: "Brute" },
  { roleName: RoleName.REVEALER, evil: true, displayName: "Revealer" },
  { roleName: RoleName.GOOD_ROGUE, evil: false, displayName: "Good Rogue" },
  { roleName: RoleName.EVIL_ROGUE, evil: true, displayName: "Evil Rogue" },

  // This should be important but also has special case rules (we often give the assassin rule to the Morgana)
  { roleName: RoleName.ASSASSIN, evil: true, displayName: "Assassin" },
  
  // These are important but are the only duplicate roles which require special handling
  { roleName: RoleName.MINION, evil: true, displayName: "Minion of Mordred" },
  { roleName: RoleName.LOYAL_SERVANT, evil: false, displayName: "Loyal Servant of Arthur" },
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