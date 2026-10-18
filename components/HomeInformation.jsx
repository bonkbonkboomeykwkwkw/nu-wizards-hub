import Link from "next/link";

export const WIZARDS_FACEBOOK_URL = "https://www.facebook.com/nuwizardscircle";

const steps = [
  { title: "Create your account", text: "Sign up with an email you can access, confirm your email, then log in.", href: "/signup", link: "Create an account" },
  { title: "Choose your tournament", text: "Check the game, team size, venue, schedule, and registration availability before entering.", href: "#tournaments", link: "Explore tournaments" },
  { title: "Submit your team", text: "Complete your roster, add your Facebook profile, upload your COR, and review the data notice.", href: "/register", link: "Open registration" },
  { title: "Keep your receipt", text: "Save your registration ID or QR code. Check your registration and follow the brackets for match updates.", href: "/check-registration", link: "Check registration" },
];

const checklist = [
  ["Confirmed account email", "Use an accessible email address for your captain account."],
  ["Team name and player details", "Prepare each player’s full name, student ID, and in-game name (IGN). Follow your tournament’s roster limit."],
  ["Certificate of Registration (COR)", "Have a clear PDF, JPG, or PNG ready, up to 10 MB."],
  ["Facebook profile link", "Prepare a valid profile URL beginning with https://facebook.com/."],
];

const questions = [
  ["Who can join a tournament?", "Check the specific tournament’s details and organizer announcements for eligibility. The registration form collects student information and a Certificate of Registration (COR). If you are unsure whether you qualify, contact NU Wizards’ Circle before submitting."],
  ["Does every player need to create an account?", "The captain submits the team registration from their confirmed account and enters the roster’s player details. Each listed player does not need a separate account for that submission."],
  ["Why can’t I find a tournament in the registration form?", "The form only lists tournaments accepting registrations whose closing deadline has not passed. Check the tournament information here or contact the organizers for availability."],
  ["How do I know my registration was saved?", "After a successful submission, the site displays a receipt with a registration ID and QR code. Save a copy for your records and use Check Registration to confirm your team’s registration anytime."],
  ["Can I submit another team or change my roster?", "The system currently allows one team registration per captain email. For corrections or roster changes after submitting, contact the organizers and include your registration ID. Avoid submitting duplicate registrations."],
  ["Where do I find match schedules and results?", "Visit Bracketing for published match information and results. Check announcements and the NU Wizards’ Circle Facebook page for organizer updates. Tournament times on this homepage are shown in Philippine time (PHT)."],
];

export function CommunitySpotlight() {
  return (
    <aside className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-slate-900/80 p-6 sm:p-8" aria-labelledby="community-heading">
      <span aria-hidden="true" className="absolute -right-4 -top-9 text-[150px] font-black leading-none text-yellow-500/10">W</span>
      <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">Meet the community</p>
      <h2 id="community-heading" className="relative mt-4 text-2xl font-bold">NU Wizards’ Circle</h2>
      <p className="mt-4 border-l-2 border-yellow-500 pl-4 text-lg font-medium leading-7">REVERT: Rebuilding Legacy, Rekindling Innovation</p>
      <p className="mt-5 text-sm leading-7 text-slate-300">Stay connected with the Circle’s community news, ICT competition opportunities, and student updates on Facebook.</p>
      <a href={WIZARDS_FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-3 font-bold text-yellow-400 hover:text-yellow-300">
        Visit our Facebook page <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span>
      </a>
    </aside>
  );
}

export default function HomeInformation() {
  return (
    <>
      <section id="how-to-join" aria-labelledby="join-heading" className="scroll-mt-6 border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-sm font-bold uppercase tracking-widest text-yellow-500">Your first match starts here</p>
          <h2 id="join-heading" className="mt-2 text-2xl font-bold sm:text-3xl">From sign-up to game day</h2>
          <p className="mt-3 max-w-2xl leading-7 text-slate-300">New to the hub? Here’s how to get your team ready and stay informed throughout the tournament.</p>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="flex flex-col border-t border-slate-700 pt-5">
                <span aria-hidden="true" className="font-mono text-3xl font-bold text-yellow-500">0{index + 1}</span>
                <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                <p className="mb-4 mt-2 text-sm leading-7 text-slate-300">{step.text}</p>
                <Link href={step.href} className="mt-auto inline-flex min-h-11 items-center text-sm font-semibold text-yellow-400 hover:text-yellow-300">{step.link} <span aria-hidden="true" className="ml-2">→</span></Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="prepare-heading" className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-yellow-500">Captain’s checklist</p>
          <h2 id="prepare-heading" className="mt-2 text-2xl font-bold sm:text-3xl">Ready before you register.</h2>
          <p className="mt-4 leading-7 text-slate-300">Gather these details with your teammates first. Double-check names and student IDs so the organizers receive an accurate roster.</p>
          <p className="mt-5 rounded-lg border border-yellow-500/25 bg-yellow-500/5 p-4 text-sm leading-6 text-slate-200">Review the event’s eligibility, format, and schedule. Requirements can vary between tournaments.</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {checklist.map(([title, description]) => (
            <li key={title} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <span aria-hidden="true" className="text-yellow-400">✓</span>
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="faq" aria-labelledby="faq-heading" className="mx-auto max-w-6xl scroll-mt-6 px-4 pb-12 sm:px-6 sm:pb-16">
        <p className="text-sm font-bold uppercase tracking-widest text-yellow-500">Good to know</p>
        <h2 id="faq-heading" className="mt-2 text-2xl font-bold sm:text-3xl">Questions before you queue?</h2>
        <div className="mt-7 divide-y divide-slate-800 border-y border-slate-800">
          {questions.map(([question, answer]) => (
            <details key={question} className="group py-1">
              <summary className="cursor-pointer rounded-lg py-5 pr-3 font-semibold marker:text-yellow-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400">{question}</summary>
              <p className="max-w-3xl pb-5 pl-5 text-sm leading-7 text-slate-300">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="about" aria-labelledby="about-heading" className="border-t border-slate-800 bg-slate-900/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-yellow-500">Beyond the bracket</p>
            <h2 id="about-heading" className="mt-2 text-2xl font-bold sm:text-3xl">Connect with the Circle</h2>
            <p className="mt-4 leading-7 text-slate-300">NU Wizards’ Circle shares community announcements, technology competition opportunities, and student updates. This tournament hub brings team registration, event details, and brackets together in one place.</p>
            <p className="mt-4 text-sm leading-7 text-slate-400">For broader organization activities and the latest posts, follow the Circle’s social pages. For tournament questions or registration corrections, reach out through the contact details here.</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
              <a href={WIZARDS_FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-yellow-400 hover:text-yellow-300">Facebook ↗<span className="sr-only"> (opens in a new tab)</span></a>
              <a href="https://www.instagram.com/nuwizardscircle/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-yellow-400 hover:text-yellow-300">Instagram ↗<span className="sr-only"> (opens in a new tab)</span></a>
            </div>
          </div>
          <address className="self-start rounded-2xl border border-slate-700 bg-slate-950/50 p-6 not-italic sm:p-8">
            <p className="text-lg font-bold">NU Wizards’ Circle</p>
            <dl className="mt-6 space-y-5 text-sm">
              <div><dt className="font-semibold text-slate-400">Email</dt><dd className="mt-2"><a className="break-all text-yellow-400 underline decoration-yellow-500/40 underline-offset-4 hover:text-yellow-300" href="mailto:wizardscircle@national-u.edu.ph">wizardscircle@national-u.edu.ph</a></dd></div>
              <div><dt className="font-semibold text-slate-400">Organization address</dt><dd className="mt-2 leading-6 text-slate-200">551 M. F. Jhocson St., Sampaloc,<br />Manila, Philippines</dd></div>
            </dl>
            <p className="mt-5 text-xs leading-6 text-slate-400">For your match venue, check the tournament listing. The organization address may differ from the event location.</p>
          </address>
        </div>
      </section>
    </>
  );
}
