import corrupt
import getopt

from tkinter import *
from tkinter import ttk


DEFAULT_CORRUPTION = 'standard'
DEFAULT_OFFSET = 2 * 1024
DEFAULT_LENGTH = 2
DEFAULT_PERIOD = 1024
DEFAULT_OUTPUTS = 1
MAX_BYTE_VAL = 255


class MainWindow:
    def __init__(self, filename=None):
        self.root = Tk()
        self.root.title("Corrupt an image")

        self.mainframe = ttk.Frame(self.root, padding="3 3 12 12")
        self.mainframe.grid(column=0, row=0, sticky=(N, W, E, S))
        self.mainframe.columnconfigure(0, weight=1)
        self.mainframe.rowconfigure(0, weight=1)

        self.output_slider = None

        self.length = IntVar(value=DEFAULT_LENGTH)
        self.offset = IntVar(value=DEFAULT_OFFSET)
        self.period = IntVar(value=DEFAULT_PERIOD)
        self.filename = StringVar(value=filename) if filename else StringVar()


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

    def add_num_entry(self, var, c, r, label_text):
        '''
        Generates an entry linked with var and a label with text label_text
        '''
        # Add the entry
        ttk.Entry(self.mainframe, width=7, textvariable=var, justify=CENTER).grid(column=c, row=r, sticky=E)
        # Add the label
        ttk.Label(self.mainframe, text=label_text).grid(column=(c + 1), row=r, stick=W)

    def run(self):
        # Length, offset, period parameters (row 1)
        self.add_num_entry(self.length, 1, 1, "length (in bytes)")
        self.add_num_entry(self.offset, 3, 1, "offset (in bytes)")
        self.add_num_entry(self.period, 5, 1, "period (in bytes)")

        # Filename, output count (row 2)
        filename_entry = ttk.Entry(self.mainframe, width=20, textvariable=self.filename)
        filename_entry.grid(column=1, row=2, columnspan=2, sticky=E)
        ttk.Label(self.mainframe, text="filename").grid(column=3, row=2, sticky=W)

        self.output_slider = Scale(self.mainframe, from_=0, to=100, length=150, orient=HORIZONTAL)
        self.output_slider.grid(column=4, row=2, columnspan=2, sticky=E)
        self.output_slider.set(DEFAULT_OUTPUTS)
        ttk.Label(self.mainframe, text="number of corrupted outputs").grid(column=6, row=2, sticky=W)
        self.output_slider.pack()

        ttk.Button(self.mainframe, text="Generate", command=self.generate).grid(column=6, row=3, sticky=E)

        for child in self.mainframe.winfo_children(): child.grid_configure(padx=5, pady=5)

        # offset_entry.focus()
        self.root.bind('<Return>', self.generate)

        self.root.mainloop()

    def generate(self):
        """
        Generate corrupted files based on the supplied parameters.
        :return:
        """
        if self.get_filename() != "":
            c = corrupt.Corruption(self.get_filename(), 'standard', self.get_offset(), self.get_length(),
                                   self.get_period())
            corrupted_filenames = [c.run() for i in range(0, self.get_num_outputs())]
            
            print("===== Corrupted files =====")
            for f in corrupted_filenames:
                print(f)

def main(argv):
    try:
        opts, args = getopt.getopt(argv, "")
    except getopt.GetoptError:
        print('crunge.py filename')
        sys.exit(2)

    # Pass the image path if provided
    if len(args) == 1:
        gui = MainWindow(args[0])
    else:
        gui = MainWindow()
    gui.run()


if __name__ == "__main__":
    main(sys.argv[1:])
