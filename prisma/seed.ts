import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// [question, options, correct index, explanation, topic]
type Q = [string, string[], number, string, string];

const QUESTIONS: Q[] = [
  // Access Control
  ["What does the principle of least privilege require?", ["Users get only the access needed for their job", "Admins get unrestricted access", "All staff share a common login", "Access is granted on request without approval"], 0, "Least privilege limits access to the minimum necessary.", "Access Control"],
  ["Which is the BEST evidence that user access reviews are performed?", ["A verbal confirmation from IT", "Signed and dated review reports with actions taken", "The access policy document", "A list of current users"], 1, "Auditors need evidence the control operated, not just that it exists.", "Access Control"],
  ["Segregation of duties is primarily designed to:", ["Speed up processing", "Reduce the risk of error or fraud by one person", "Lower licence costs", "Simplify user training"], 1, "No single person should control all stages of a transaction.", "Access Control"],
  ["When an employee leaves, their system access should be:", ["Kept for 6 months in case they return", "Transferred to their manager", "Revoked promptly per the termination process", "Disabled only at year-end"], 2, "Timely de-provisioning prevents unauthorised access.", "Access Control"],
  ["Multi-factor authentication combines:", ["Two passwords", "Two or more different factor types (know/have/are)", "A username and a password", "A password and a security question"], 1, "MFA needs factors of different types.", "Access Control"],
  ["A shared generic 'admin' account is a concern mainly because:", ["It is hard to remember", "Actions cannot be traced to an individual", "It costs more", "It slows the system down"], 1, "Shared accounts break accountability.", "Access Control"],
  ["Privileged access should be:", ["Granted to all IT staff by default", "Restricted, approved and monitored", "Reviewed only by the privileged user", "Unlogged to improve performance"], 1, "Privileged access carries the highest risk.", "Access Control"],
  ["Which password control is the WEAKEST?", ["Minimum length of 12 characters", "Account lockout after failed attempts", "Passwords written on sticky notes", "Password history enforcement"], 2, "Written-down passwords defeat the control.", "Access Control"],
  ["Role-based access control assigns permissions based on:", ["The user's seniority", "The user's job role", "The user's location", "Random allocation"], 1, "RBAC maps permissions to defined roles.", "Access Control"],
  ["An auditor finds 15 active accounts for terminated staff. This indicates a weakness in:", ["Backup", "User de-provisioning", "Change management", "Capacity planning"], 1, "Leavers' accounts should be removed promptly.", "Access Control"],

  // Change Management
  ["The main objective of change management controls is to ensure:", ["Changes are made as quickly as possible", "Only authorised, tested changes reach production", "Developers have production access", "Users never request changes"], 1, "Change management protects integrity of production systems.", "Change Management"],
  ["Developers having direct write access to production is a risk because:", ["It increases licence fees", "Unauthorised or untested changes can be made", "It slows down development", "It improves audit trails"], 1, "It bypasses segregation between development and production.", "Change Management"],
  ["An emergency change should:", ["Never be documented", "Be documented and approved retrospectively", "Skip testing permanently", "Be made by any available user"], 1, "Emergency changes still need after-the-fact review.", "Change Management"],
  ["User acceptance testing (UAT) is performed by:", ["The vendor only", "Business users who will use the system", "External auditors", "The database administrator only"], 1, "UAT confirms the change meets business needs.", "Change Management"],
  ["Which is the BEST audit test for change management?", ["Interview the developer", "Select a sample of changes and trace them to approval and test evidence", "Read the change policy", "Count the number of changes"], 1, "Testing a sample shows whether the control operated.", "Change Management"],
  ["A Change Advisory Board (CAB) is responsible for:", ["Writing code", "Reviewing and approving significant changes", "Running backups", "Hiring developers"], 1, "The CAB assesses risk and approves changes.", "Change Management"],
  ["Version control systems help auditors by:", ["Encrypting the database", "Providing a history of who changed what and when", "Replacing testing", "Removing the need for approvals"], 1, "They give a traceable change history.", "Change Management"],
  ["A rollback plan is needed so that:", ["Changes can be reversed if they fail", "Users can roll back their passwords", "Backups are not needed", "Testing can be skipped"], 0, "Rollback limits the impact of failed changes.", "Change Management"],
  ["Comparing production code to the approved release is used to detect:", ["Slow performance", "Unauthorised changes", "Network outages", "Licence breaches"], 1, "Differences may indicate unapproved changes.", "Change Management"],
  ["Who should migrate approved changes into production ideally?", ["The developer who wrote the code", "An independent release/operations team", "Any business user", "The external auditor"], 1, "Independent migration enforces segregation of duties.", "Change Management"],

  // Backup & DR
  ["The Recovery Point Objective (RPO) defines:", ["Maximum tolerable downtime", "Maximum acceptable data loss measured in time", "Number of backup tapes", "Cost of recovery"], 1, "RPO is about how much data you can afford to lose.", "Backup & DR"],
  ["The Recovery Time Objective (RTO) defines:", ["How long it may take to restore service", "How much data may be lost", "How often backups run", "Where backups are stored"], 0, "RTO is the target time to restore operations.", "Backup & DR"],
  ["The BEST evidence that backups are effective is:", ["Backup job success logs", "Successful periodic restore tests", "The backup policy", "The backup software licence"], 1, "Only a restore proves the backup is usable.", "Backup & DR"],
  ["Storing backups offsite or in another region protects against:", ["User errors only", "Site-wide disasters", "Weak passwords", "Software bugs only"], 1, "Offsite copies survive a disaster at the main site.", "Backup & DR"],
  ["A Business Impact Analysis (BIA) is used to:", ["Identify critical processes and recovery priorities", "Test firewall rules", "Approve code changes", "Assign user roles"], 0, "BIA drives RTO/RPO and DR priorities.", "Backup & DR"],
  ["How often should a disaster recovery plan be tested?", ["Never, it's too disruptive", "Periodically, at least annually", "Only after a disaster", "Only when auditors ask"], 1, "Regular testing keeps the plan valid.", "Backup & DR"],
  ["The 3-2-1 backup rule means:", ["3 copies, 2 media types, 1 offsite", "3 backups per day, 2 per week, 1 per month", "3 admins, 2 approvers, 1 auditor", "3 servers, 2 sites, 1 cloud"], 0, "A common baseline for resilient backups.", "Backup & DR"],
  ["Encrypting backup media mainly protects:", ["Backup speed", "Confidentiality if media is lost or stolen", "Restore time", "Storage cost"], 1, "Encryption protects data at rest.", "Backup & DR"],
  ["A 'hot site' is:", ["An empty building with power", "A fully equipped site ready to take over quickly", "A site with only network cabling", "A backup tape vault"], 1, "Hot sites provide the fastest recovery.", "Backup & DR"],
  ["Ransomware recovery is BEST supported by:", ["Backups that are immutable or offline", "Backups on the same file share", "Larger hard disks", "More user accounts"], 0, "Attackers often encrypt reachable backups too.", "Backup & DR"],

  // IT Governance & Audit
  ["COBIT is primarily a framework for:", ["Network design", "Governance and management of enterprise IT", "Software coding standards", "Hardware procurement"], 1, "COBIT is ISACA's IT governance framework.", "IT Governance"],
  ["ISO/IEC 27001 specifies requirements for:", ["Quality management", "An information security management system (ISMS)", "Environmental management", "Project management"], 1, "ISO 27001 is the ISMS standard.", "IT Governance"],
  ["IT General Controls (ITGCs) typically include:", ["Access, change management, operations and backup", "Only financial reconciliations", "Marketing approvals", "HR payroll calculations"], 0, "ITGCs underpin reliable application controls.", "IT Governance"],
  ["An application control example is:", ["Data centre door locks", "Input validation that rejects invalid dates", "Annual security awareness training", "Firewall configuration"], 1, "Application controls operate within a specific application.", "IT Governance"],
  ["A 'test of design' checks whether a control:", ["Operated over the whole period", "Is suitably designed to address the risk", "Is cheap to run", "Was documented by IT"], 1, "Design comes first, then operating effectiveness.", "IT Governance"],
  ["A 'test of operating effectiveness' checks whether a control:", ["Exists in the policy", "Operated consistently as designed during the period", "Has a named owner", "Is automated"], 1, "Operating effectiveness needs evidence over time.", "IT Governance"],
  ["A SOC 1 / SOC 2 report is used to obtain assurance over:", ["Internal payroll only", "Controls at a third-party service organisation", "Employee performance", "Software licence counts"], 1, "Service organisation reports cover outsourced controls.", "IT Governance"],
  ["Which is a compensating control?", ["A control that replaces the main control entirely", "An alternative control that reduces risk when a primary control is weak", "A control that compensates staff", "A control that is never tested"], 1, "Compensating controls mitigate the gap left by a weak control.", "IT Governance"],
  ["Risk is commonly assessed as a combination of:", ["Cost and time", "Likelihood and impact", "Users and systems", "Hardware and software"], 1, "Likelihood × impact is the classic risk model.", "IT Governance"],
  ["An audit finding should normally contain:", ["Only the auditor's opinion", "Condition, criteria, cause, effect and recommendation", "A list of staff names", "The audit fee"], 1, "The 5 C's structure makes findings actionable.", "IT Governance"],
];

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { email, name: process.env.ADMIN_NAME ?? "Administrator", role: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`Admin: ${admin.email} / ${password}`);

  await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: { email: "student@example.com", name: "Demo Student", department: "Finance", passwordHash: await bcrypt.hash("student123", 10) },
  });
  console.log("Demo student: student@example.com / student123");

  const slug = "it-audit-fundamentals";
  if (!(await prisma.assessment.findUnique({ where: { slug } }))) {
    await prisma.assessment.create({
      data: {
        title: "IT Audit Fundamentals",
        trainingSession: "IT Audit Fundamentals Workshop (Demo)",
        description: "Answer all questions. Each participant receives a different random selection from the question bank.",
        slug,
        questionsPerAttempt: 10,
        durationMinutes: 15,
        passPercent: 60,
        maxRetakes: 1,
        isPublished: true,
        questions: {
          create: QUESTIONS.map(([text, options, correctIndex, explanation, topic]) => ({
            text,
            options: JSON.stringify(options),
            correctIndex,
            explanation,
            topic,
          })),
        },
      },
    });
    console.log(`Sample assessment created: /a/${slug} (${QUESTIONS.length} questions, 10 per student)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
