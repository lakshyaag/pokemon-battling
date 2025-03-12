import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const getStatusClass = (status: string): string => {
  // Get status class for styling
  switch (status.toLowerCase()) {
    case "par":
      return "bg-yellow-400 text-yellow-900";
    case "psn":
    case "tox":
      return "bg-purple-600 text-white";
    case "brn":
      return "bg-orange-500 text-white";
    case "slp":
      return "bg-gray-400 text-gray-900";
    case "frz":
      return "bg-blue-300 text-blue-900";
    default:
      return "bg-gray-600 text-white";
  }
};

// Get status display name
export const getStatusName = (status: string): string => {
  switch (status.toLowerCase()) {
    case "par":
      return "Paralyzed";
    case "psn":
      return "Poisoned";
    case "tox":
      return "Badly Poisoned";
    case "brn":
      return "Burned";
    case "slp":
      return "Asleep";
    case "frz":
      return "Frozen";
    default:
      return status;
  }
};
