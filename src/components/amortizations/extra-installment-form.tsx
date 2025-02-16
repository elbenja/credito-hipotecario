
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import {
  extraInstallmentFormSchema,
  defaultValues,
  type ExtraInstallmentFormValues,
} from "./extra-installment-schema"

type ExtraInstallmentFormProps = {
  onSubmit: (values: ExtraInstallmentFormValues) => void
  isLoading?: boolean
}

export function ExtraInstallmentForm({ onSubmit, isLoading }: ExtraInstallmentFormProps) {
  const form = useForm<ExtraInstallmentFormValues>({
    resolver: zodResolver(extraInstallmentFormSchema),
    defaultValues,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Form.Field
              control={form.control}
              name="amount"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Amount</Form.Label>
                  <Form.Control>
                    <Input placeholder="Enter amount..." {...field} />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              )}
            />
          </div>

          <div className="space-y-2">
            <Form.Field
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Frequency</Form.Label>
                  <Select
                    value={field.value}
                    onValueChange={(value: 'monthly' | 'one-time') => field.onChange(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-time">One-time</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Form.Message />
                </Form.Item>
              )}
            />
          </div>

          <div className="space-y-2">
            <Form.Field
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Start Date</Form.Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          !field.value && "text-muted-foreground"
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Form.Message />
                </Form.Item>
              )}
            />
          </div>
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Adding..." : "Add Extra Installment"}
        </Button>
      </form>
    </Form>
  )
}
