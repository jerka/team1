from socketIO_client import SocketIO, BaseNamespace
from threading import Thread
import sys


def on_message(*args):
    print args[0]['nick'] + ' says: ' + args[0]['message']

def on_connect(*args):
    print 'Connected. Type your messages and press enter. Type quit to quit.'

def message(arg):
    while True:
        message = raw_input()
        if message == "quit":
            sys.exit()
        socketIO.emit('message', { 'nick': 'python', 'message': message })

if __name__ == "__main__":
    socketIO = SocketIO('localhost', 8080)
    socketIO.on('connect', on_connect)
    socketIO.on('message', on_message)

    try:
        message_thread = Thread(target = message, args = (10, ))
        message_thread.start()
        message_thread.join()
        socketIO.wait()
    except (KeyboardInterrupt, SystemExit):
        sys.exit();



#nick = "python"




