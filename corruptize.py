import corrupter

from tkinter import *
from tkinter import ttk


DEFAULT_CORRUPTION = 'standard'
DEFAULT_OFFSET = 2 * 1024
DEFAULT_LENGTH = 2
DEFAULT_PERIOD = 1024
DEFAULT_OUTPUTS = 1
MAX_BYTE_VAL = 255


class GUIWindow:
    length = None
    offset = None
    period = None
    filename = ''

    output_slider = None

    def get_length(self):
        return self.length.get()

    def get_offset(self):
        return self.offset.get()

    def get_period(self):
        return self.period.get()

    def get_filename(self):
        return self.filename.get()

    def get_num_outputs(self):
        return self.output_slider.get()

    def run(self):
        root = Tk()
        root.title("Corrupt an image")

        mainframe = ttk.Frame(root, padding="3 3 12 12")
        mainframe.grid(column=0, row=0, sticky=(N, W, E, S))
        mainframe.columnconfigure(0, weight=1)
        mainframe.rowconfigure(0, weight=1)

        self.length = IntVar(value=DEFAULT_LENGTH)
        self.offset = IntVar(value=DEFAULT_OFFSET)
        self.period = IntVar(value=DEFAULT_PERIOD)
        self.filename = StringVar()

        # Length, offset, period parameters (row 1)

        length_entry = ttk.Entry(mainframe, width=7, textvariable=self.length)
        length_entry.grid(column=1, row=1)
        ttk.Label(mainframe, text="length (in bytes)").grid(column=2, row=1)

        offset_entry = ttk.Entry(mainframe, width=7, textvariable=self.offset)
        offset_entry.grid(column=3, row=1)
        ttk.Label(mainframe, text="offset (in bytes)").grid(column=4, row=1)

        period_entry = ttk.Entry(mainframe, width=7, textvariable=self.period)
        period_entry.grid(column=5, row=1)
        ttk.Label(mainframe, text="period (in bytes)").grid(column=6, row=1)

        # Filename, number of outputs (row 2)

        filename_entry = ttk.Entry(mainframe, width=20, textvariable=self.filename)
        filename_entry.grid(column=1, row=2)
        ttk.Label(mainframe, text="filename").grid(column=2, row=2)

        self.output_slider = Scale(mainframe, from_=0, to=100, orient=HORIZONTAL)
        self.output_slider.grid(column=3, row=2)
        self.output_slider.set(DEFAULT_OUTPUTS)
        ttk.Label(mainframe, text="number of corrupted outputs").grid(column=4, row=2)
        self.output_slider.pack()

        ttk.Button(mainframe, text="Generate", command=self.generate).grid(column=6, row=3, sticky=E)

        for child in mainframe.winfo_children(): child.grid_configure(padx=5, pady=5)

        offset_entry.focus()
        root.bind('<Return>', self.generate)

        root.mainloop()

    def generate(self):
        if (self.get_filename() != ""):
            c = corrupter.Corrupter(self.get_filename(), 'standard', self.get_offset(), self.get_length(),
                                    self.get_period())
            names = [c.run() for i in range(0, self.get_num_outputs())]
            print(names)


def main():
    gui = GUIWindow()
    gui.run()


if __name__ == "__main__":
    main()
