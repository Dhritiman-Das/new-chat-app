import {
  ArrowUpRight,
  InfoIcon,
  Calendar,
  Home,
  Inbox,
  Search,
  Settings,
  ChevronDownIcon,
  ChevronRight,
  MoreHorizontal,
  CheckIcon,
  ChevronUpIcon,
  CircleIcon,
  ArrowLeft,
  ArrowRight,
  XIcon,
  PanelLeftIcon,
  ChevronLeft,
  MinusIcon,
  GripVerticalIcon,
  Bot,
  Database,
  MessageSquare,
  Clock,
  Cable,
  Hammer,
  PlusCircle,
  MessageCircle,
  Building,
  SquareTerminal,
  ChartColumn,
  Loader2,
  SunMedium,
  Moon,
  Laptop,
  CreditCard,
  MoreVertical,
  Plus,
  HelpCircle,
  User,
  File,
  FileText,
  Image,
  Trash,
  Twitter,
  RefreshCw,
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  Sparkles,
  KeyRound,
  Bell,
  ExternalLinkIcon,
  Code,
  CalendarIcon,
  XCircle,
  Settings2,
  Loader,
  Upload,
  CopyIcon,
  MailIcon,
  CheckCircle,
  RefreshCcw,
  FileUp,
  Download,
  Trash2,
  CheckCircle2,
  Filter,
  Sliders,
  EyeOff,
  ListFilter,
  Text,
  ArrowDownUp,
  ChevronsLeft,
  ChevronsRight,
  CircleDashed,
  CircleOff,
  ArrowUp,
  ArrowDown,
  BookOpen,
} from "lucide-react";
import { AiOutlineOpenAI } from "react-icons/ai";
import {
  PiFileTxt,
  PiFilePdf,
  PiFileDoc,
  PiFileXls,
  PiFilePpt,
} from "react-icons/pi";
import { FaXTwitter } from "react-icons/fa6";
import { SiGooglecalendar, SiSlack } from "react-icons/si";
import { TiContacts } from "react-icons/ti";
import { PiTargetDuotone } from "react-icons/pi";

// Create an Icons object that contains all icons
export const Icons = {
  LogoSmall: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={32}
      height={32}
      fill="none"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M15.304 0c-2.41.103-4.681.739-6.7 1.792l6.7 11.606V0Zm0 18.603-6.7 11.605a15.927 15.927 0 0 0 6.7 1.792V18.603ZM16.697 32V18.595L23.4 30.206A15.928 15.928 0 0 1 16.697 32Zm0-18.594V0c2.41.103 4.684.74 6.704 1.794l-6.704 11.612Zm-14.205 11.2L14.1 17.904 7.398 29.51a16.1 16.1 0 0 1-4.906-4.905Zm27.02-17.208-11.607 6.701 6.701-11.607a16.101 16.101 0 0 1 4.905 4.906ZM2.49 7.396A16.1 16.1 0 0 1 7.398 2.49l6.704 11.61L2.49 7.396Zm-.697 1.206A15.927 15.927 0 0 0 0 15.306h13.406L1.793 8.602ZM1.794 23.4A15.927 15.927 0 0 1 0 16.699h13.401L1.794 23.4Zm16.805-8.095H32a15.927 15.927 0 0 0-1.792-6.702l-11.61 6.702ZM30.207 23.4l-11.604-6.7H32c-.104 2.41-.74 4.68-1.793 6.7Zm-12.3-5.494 6.699 11.604a16.1 16.1 0 0 0 4.904-4.905l-11.604-6.7Z"
        clipRule="evenodd"
      />
    </svg>
  ),
  LogoIcon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 60 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M44.5834 48.4167C41.8207 48.4167 39.1712 47.3192 37.2177 45.3657C35.2642 43.4122 34.1667 40.7627 34.1667 38C34.1667 32.25 36.2501 29.6667 38.3334 25.5C42.8001 16.5708 39.2667 8.60833 30.0001 0.5C27.9167 10.9167 21.6667 20.9167 13.3334 27.5833C5.00008 34.25 0.833417 42.1667 0.833417 50.5C0.833417 54.3302 1.58783 58.1229 3.05359 61.6616C4.51936 65.2003 6.66776 68.4156 9.37614 71.1239C12.0845 73.8323 15.2998 75.9807 18.8385 77.4465C22.3771 78.9122 26.1699 79.6667 30.0001 79.6667C33.8303 79.6667 37.623 78.9122 41.1617 77.4465C44.7003 75.9807 47.9157 73.8323 50.624 71.1239C53.3324 68.4156 55.4808 65.2003 56.9466 61.6616C58.4123 58.1229 59.1667 54.3302 59.1667 50.5C59.1667 45.6958 57.3626 40.9417 55.0001 38C55.0001 40.7627 53.9026 43.4122 51.9491 45.3657C49.9956 47.3192 47.3461 48.4167 44.5834 48.4167Z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Logo: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={112}
      height={28}
      fill="none"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12.434 0A12.94 12.94 0 0 0 6.99 1.456l5.444 9.43V0Zm0 15.116-5.443 9.428A12.942 12.942 0 0 0 12.434 26V15.116ZM13.566 26V15.108l5.447 9.435A12.94 12.94 0 0 1 13.566 26Zm0-15.107V0c1.959.084 3.806.6 5.447 1.458l-5.447 9.435ZM2.024 19.992l9.433-5.446-5.446 9.432a13.081 13.081 0 0 1-3.987-3.986ZM23.978 6.011l-9.43 5.444 5.445-9.43a13.082 13.082 0 0 1 3.985 3.986ZM2.023 6.009a13.081 13.081 0 0 1 3.988-3.986l5.446 9.433-9.434-5.447Zm-.566.98A12.94 12.94 0 0 0 0 12.436h10.892L1.457 6.99Zm0 12.024A12.94 12.94 0 0 1 0 13.568h10.888l-9.43 5.445Zm13.654-6.577h10.89a12.941 12.941 0 0 0-1.457-5.446l-9.433 5.446Zm9.432 6.575-9.428-5.443H26a12.94 12.94 0 0 1-1.457 5.443Zm-9.995-4.464 5.444 9.429a13.08 13.08 0 0 0 3.985-3.985l-9.429-5.444Z"
        clipRule="evenodd"
      />
      <path
        fill="currentColor"
        d="M37.36 10.52h1.2l.048 1.44c.384-1.04 1.264-1.632 2.448-1.632 1.216 0 2.096.656 2.464 1.792.368-1.152 1.264-1.792 2.592-1.792 1.696 0 2.688 1.184 2.688 3.216V19h-1.312v-5.072c0-1.552-.608-2.432-1.648-2.432-1.328 0-2.096.896-2.096 2.448V19h-1.312v-5.072c0-1.52-.624-2.432-1.648-2.432-1.312 0-2.112.928-2.112 2.432V19H37.36v-8.48Zm14.39 0h1.312V19H51.75v-8.48Zm-.032-1.328v-1.52h1.376v1.52h-1.376ZM63.333 7.64V19H62.15l-.048-1.248c-.48.896-1.392 1.44-2.704 1.44-2.448 0-3.584-2.08-3.584-4.432 0-2.352 1.136-4.432 3.584-4.432 1.248 0 2.144.48 2.624 1.344V7.64h1.312Zm-6.144 7.12c0 1.648.704 3.184 2.48 3.184 1.744 0 2.464-1.568 2.464-3.184 0-1.68-.72-3.232-2.464-3.232-1.776 0-2.48 1.536-2.48 3.232ZM73.6 7.64V19h-1.185l-.048-1.248c-.48.896-1.392 1.44-2.704 1.44-2.448 0-3.584-2.08-3.584-4.432 0-2.352 1.136-4.432 3.584-4.432 1.248 0 2.144.48 2.624 1.344V7.64h1.312Zm-6.145 7.12c0 1.648.704 3.184 2.48 3.184 1.744 0 2.464-1.568 2.464-3.184 0-1.68-.72-3.232-2.464-3.232-1.776 0-2.48 1.536-2.48 3.232Zm9.033-1.744c.336-1.648 1.648-2.688 3.456-2.688 2.192 0 3.408 1.28 3.408 3.552v3.408c0 .384.16.544.528.544h.336V19h-.56c-.864 0-1.616-.288-1.6-1.328-.368.8-1.328 1.52-2.672 1.52-1.68 0-3.04-.896-3.04-2.4 0-1.744 1.328-2.192 3.184-2.56l2.512-.48c-.016-1.472-.704-2.176-2.096-2.176-1.088 0-1.808.56-2.064 1.552l-1.392-.112Zm1.232 3.776c0 .688.592 1.248 1.84 1.232 1.408 0 2.512-.992 2.512-2.96v-.144l-2.032.352c-1.264.224-2.32.32-2.32 1.52Zm7.661-6.272h1.408l2.576 7.072 2.48-7.072h1.392l-3.44 9.552c-.32.912-.928 1.328-1.888 1.328H86.9v-1.168h.88c.432 0 .688-.16.848-.608l.304-.784h-.448l-3.104-8.32Z"
      />
    </svg>
  ),
  ArrowUpRight,
  Info: InfoIcon,
  Calendar,
  Home,
  Inbox,
  Search,
  Settings,
  ChevronDown: ChevronDownIcon,
  ChevronRight,
  MoreHorizontal,
  Check: CheckIcon,
  ChevronUp: ChevronUpIcon,
  Circle: CircleIcon,
  ArrowLeft,
  ArrowRight,
  X: XIcon,
  PanelLeft: PanelLeftIcon,
  ChevronLeft,
  Minus: MinusIcon,
  GripVertical: GripVerticalIcon,
  Bot,
  Database,
  MessageSquare,
  Clock,
  Cable,
  Hammer,
  PlusCircle,
  MessageCircle,
  Building,
  Terminal: SquareTerminal,
  Chart: ChartColumn,
  OpenAI: AiOutlineOpenAI,
  XAI: FaXTwitter,
  GoogleCalendar: SiGooglecalendar,
  Contacts: TiContacts,
  Slack: SiSlack,
  Spinner: Loader2,
  Sun: SunMedium,
  Moon,
  Laptop,
  Billing: CreditCard,
  Ellipsis: MoreVertical,
  Add: Plus,
  Warning: HelpCircle,
  User,
  File,
  FileText,
  Image,
  Trash,
  Twitter,
  RefreshCw,
  Txt: PiFileTxt,
  Pdf: PiFilePdf,
  Doc: PiFileDoc,
  Xls: PiFileXls,
  Ppt: PiFilePpt,
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
  Sparkles,
  Key: KeyRound,
  ExternalLink: ExternalLinkIcon,
  Code,
  CalendarIcon: CalendarIcon,
  XCircle,
  Settings2,
  Loader,
  Upload,
  Copy: CopyIcon,
  Mail: MailIcon,
  CheckCircle,
  RefreshCcw,
  FileUp,
  Download,
  Trash2,
  CheckCircle2,
  Filter,
  Sliders,
  EyeOff,
  ListFilter,
  Text,
  ArrowDownUp,
  ChevronsLeft,
  ChevronsRight,
  CircleDashed,
  CircleOff,
  ArrowUp,
  ArrowDown,
  BookOpen,
  LeadCapture: PiTargetDuotone,
};

// Export individual icons for direct imports
export {
  ArrowUpRight,
  Calendar,
  Home,
  Inbox,
  Search,
  Settings,
  ChevronRight,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Bot,
  Database,
  MessageSquare,
  MessageCircle,
  Clock,
  Cable,
  Hammer,
  PlusCircle,
  Building,
  ChartColumn as Chart,
};

// Export the React Icons components
export { AiOutlineOpenAI as OpenAI };
export { FaXTwitter as XAI };
